// Spil: Akvariet — et levende akvarium. Tryk oppe ved vandkanten for at drysse mad; fiskene kappes om flagerne,
// og efter fem flager vokser en unge sig stor. Gyldne bobler giver perler: fem perler åbner skattekisten, og et nyt
// havdyr svømmer ud i et spotlys. Hvert dyr har sit eget trick, når man trykker på det. Akvariebogen viser alle 15,
// og sol/måne-knappen gør det nat, så fiskene sover og lysfisken og vandmanden lyser.
// Er en voksen blevet mæt nogle gange, lægger den et æg; tryk på ægget, så kommer en lille unge ud og følger efter den.
// Vand, lys og dyr tegnes på ét lærred (canvas); knapper, perler og bog er almindelige elementer ovenpå.
(function () {
  const STI = "billeder/akvarie/";
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const VOKS = 10; // flager, før en unge bliver stor
  // Mæt: efter MAET flager er en fisk mæt i ca. LUR sekunder. Den svømmer videre og leger (små hjerter over den,
  // tricks virker stadig), men den er ligeglad med maden, så de andre fisk får en chance, og man ikke kan fodre
  // alle store på få minutter. Ingen søvn og ingen ventetid. Tiden følger det rigtige ur og gemmes (gem.lur).
  const MAET = 2, LUR = 40;
  const maet = f => f.lurTil > Date.now();
  const PERLER = 5; // perler, før kisten åbner
  // Unger: når en voksen er blevet mæt AEG gange, lægger den et æg på sandet. Tryk på ægget, så kommer en lille unge ud,
  // som svømmer efter sin mor eller far. Højst én unge pr. art. Ungerne bliver små (det er meningen) og kan fodres.
  // Delfinen og hvalen lægger ikke æg; deres unge kommer i en stor boble i stedet.
  const AEG = 3, UNGE_STR = .78;
  const LEVENDE = new Set(["delfin", "hval"]);
  // Ro i akvariet: er der mange dyr, svømmer nogle af og til ud af billedet og kommer tilbage senere,
  // så der højst er ca. SYNLIGE svømmere på skærmen ad gangen. Krabben, søstjernen og vandmanden bliver (og tæller ikke med).
  const SYNLIGE = { bred: 6, smal: 4 };
  const BLIVER = new Set(["krabbe", "stjerne", "vandmand"]);
  // Stemmen hjælper kun begyndere: når man har fundet BEGYNDER dyr, stopper de gentagne hjælpe-replikker.
  const BEGYNDER = 6;
  const vaek = f => !!(f.ude && f.ude.vaek && !f.ude.ret);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const glat = t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
  const fjeder = t => { const c = 1.7; t = clamp(t, 0, 1); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
  const bump = (t, a, b) => t <= a || t >= b ? 0 : Math.sin((t - a) / (b - a) * Math.PI);
  const vinkel = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const stor = s => s[0].toUpperCase() + s.slice(1);

  /* ---------- Dyrene ---------- */
  // Rækkefølgen er også den rækkefølge, de findes i: de tre første er der fra start.
  // str: største mål i forhold til grundstørrelsen (voksen). fart: svømmefart. zone: foretrukken dybde (0 = overfladen, 1 = bunden).
  // mund: hvor munden sidder i billedet (brøkdel fra midten, billedet vender mod venstre). front: billedet vender mod os (vendes ikke).
  const ARTER = [
    { k: "klovnfisk", navn: "Klovnfisk", best: "klovnfisken", fisk: 1, str: 1, fart: .55, slags: "fisk", zone: [.15, .8], mund: [.42, .1] },
    { k: "guldfisk", navn: "Guldfisk", best: "guldfisken", fisk: 1, str: 1, fart: .45, slags: "fisk", zone: [.1, .75], mund: [.43, .08] },
    { k: "krabbe", navn: "Krabbe", best: "krabben", str: .85, fart: .4, slags: "krabbe", front: 1, mund: [0, 0] },
    { k: "kuglefisk", navn: "Kuglefisk", best: "kuglefisken", fisk: 1, str: .95, fart: .32, slags: "fisk", zone: [.2, .8], mund: [.4, .12] },
    { k: "soestjerne", navn: "Søstjerne", best: "søstjernen", str: .72, fart: .05, slags: "stjerne", front: 1, mund: [0, 0] },
    { k: "vandmand", navn: "Vandmand", best: "vandmanden", str: .9, fart: .14, slags: "vandmand", front: 1, lys: 1, zone: [.05, .6], mund: [0, 0] },
    { k: "havskildpadde", navn: "Havskildpadde", best: "havskildpadden", str: 1.3, fart: .28, slags: "skildpadde", zone: [.15, .7], mund: [.44, .02] },
    { k: "kirurgfisk", navn: "Kirurgfisk", best: "kirurgfisken", fisk: 1, str: 1.05, fart: .7, slags: "fisk", zone: [.1, .85], mund: [.42, .05] },
    { k: "blaeksprutte", navn: "Blæksprutte", best: "blæksprutten", str: 1.05, fart: .4, slags: "blaek", front: 1, zone: [.5, 1], mund: [0, .1] },
    { k: "soehest", navn: "Søhest", best: "søhesten", fisk: 1, str: .85, fart: .15, slags: "soehest", zone: [.3, .85], mund: [.3, -.25] },
    { k: "lysfisk", navn: "Lysfisk", best: "lysfisken", fisk: 1, str: 1, fart: .28, slags: "fisk", lys: 1, zone: [.55, .95], mund: [.36, .1] },
    { k: "rokke", navn: "Rokke", best: "rokken", fisk: 1, str: 1.35, fart: .42, slags: "rokke", zone: [.5, .95], mund: [.4, .05] },
    { k: "delfin", navn: "Delfin", best: "delfinen", str: 1.4, fart: .95, slags: "delfin", zone: [.05, .55], mund: [.46, .05] },
    { k: "haj", navn: "Haj", best: "hajen", fisk: 1, str: 1.5, fart: .6, slags: "fisk", zone: [.2, .75], mund: [.42, .15] },
    { k: "hval", navn: "Hval", best: "hvalen", str: 1.9, fart: .28, slags: "hval", zone: [.05, .45], mund: [.44, .15] },
  ];
  const ART = Object.fromEntries(ARTER.map(a => [a.k, a]));
  // Rigtige fakta til akvariebogen. Tryk på et fundet dyr i bogen: stemmen læser én fakta, næste tryk giver den næste.
  // Lydfiler: lyd/fakta-<dyr>-<nr>.mp3 (nr fra 0). Mangler filen, bruges browserens stemme.
  const FAKTA = {
    klovnfisk: ["Klovnfisken bor i en søanemone. Anemonen brænder andre fisk, men klovnfisken har et slimlag, der beskytter den.",
      "Klovnfisken er ikke ret stor. Den er cirka så lang som din hånd.",
      "I en klovnfiskefamilie er den største fisk altid moren."],
    guldfisk: ["Guldfisken har ingen mave. Maden går direkte ned i tarmen.",
      "Guldfisk kan huske ting i mange måneder. Nogle kan lære at komme, når man skal fodre dem.",
      "Guldfisk kommer oprindeligt fra Kina, og nogle bliver over tyve år gamle."],
    krabbe: ["Krabben går sidelæns.",
      "Krabben har ti ben. De to forreste er store klosakse.",
      "Når krabben vokser, smider den sit gamle skjold og får et nyt. Ved stranden i Danmark kan du finde strandkrabber."],
    kuglefisk: ["Når kuglefisken bliver bange, pumper den sig op med vand og bliver rund som en bold.",
      "Kuglefisken er giftig, så de fleste andre dyr lader den være.",
      "Kuglefisken har fire store tænder, som kan knuse muslinger og snegle."],
    soestjerne: ["Søstjernen har fem arme. Hvis den mister en arm, kan den gro en ny.",
      "Søstjernen har et lille øje for enden af hver arm.",
      "Søstjernen har ingen hjerne. Du kan finde søstjerner ved stranden i Danmark."],
    vandmand: ["Vandmanden er næsten kun lavet af vand.",
      "Vandmanden har ingen hjerne, intet hjerte og ingen knogler.",
      "I Danmark findes der en rød vandmand, der hedder brandmand. Den kan brænde, så den må man ikke røre ved."],
    havskildpadde: ["Havskildpadden kan ikke trække hovedet ind i skjoldet, sådan som skildpadder på land kan.",
      "Havskildpadden lægger sine æg i sandet på en strand. Når ungerne kommer ud, kravler de selv ned til havet.",
      "Havskildpadden kan holde vejret i flere timer, når den sover under vandet."],
    kirurgfisk: ["Kirurgfisken har en skarp torn ved halen, ligesom en lille kniv. Det er derfor, den hedder kirurgfisk.",
      "Kirurgfisken spiser alger og hjælper med at holde koralrevet rent.",
      "Kirurgfisken bor i varme have ved koralrev."],
    blaeksprutte: ["Blæksprutten har otte arme med sugekopper, så den kan holde fast.",
      "Blæksprutten har tre hjerter, og dens blod er blåt.",
      "Blæksprutten kan skifte farve, og den sprøjter blæk, når den vil gemme sig."],
    soehest: ["Søhesten er en fisk, selv om den ligner en lille hest.",
      "Hos søhesten er det far, der bærer ungerne i en lomme på maven.",
      "Søhesten holder fast i tang med halen, så den ikke flyder væk."],
    lysfisk: ["Lysfisken bor dybt nede i havet, hvor der er helt mørkt.",
      "Lysfisken har en lille lampe på hovedet. Lyset lokker små dyr hen til dens mund.",
      "Lyset i lampen bliver lavet af bittesmå bakterier."],
    rokke: ["Rokken svømmer ved at blafre med sine store, flade finner, som om den flyver.",
      "Rokken har munden på undersiden af kroppen, så den kan spise ting på bunden.",
      "Rokken er i familie med hajen. Den har ingen knogler, men brusk, ligesom dine ører."],
    delfin: ["Delfinen er ikke en fisk. Den skal op til overfladen for at trække vejret gennem et hul på hovedet.",
      "Delfiner snakker med hinanden med klik og fløjt.",
      "Når delfinen sover, hviler den kun den ene halvdel af hjernen ad gangen."],
    haj: ["Hajen får nye tænder hele livet. Når en tand falder ud, kommer der en ny.",
      "Hajen har ingen knogler. Dens skelet er lavet af brusk, ligesom dine ører.",
      "Den største fisk i verden er hvalhajen. Den er længere end en bus, men den spiser kun bittesmå dyr."],
    hval: ["Blåhvalen er det største dyr, der nogensinde har levet. Den er større end alle dinosaurerne.",
      "Hvalen trækker vejret gennem et pustehul på toppen af hovedet. Når den puster ud, sprøjter det vand op.",
      "Hvalen er ikke en fisk. Hvalungen drikker mælk fra sin mor."],
  };
  const faktaNr = {};
  const START = ARTER.slice(0, 3).map(a => a.k);
  // Faste punkter i billederne (brøkdel af bredde og højde, billedet vender mod venstre)
  const ANKER = {
    "lysfisk-unge": [.17, .3], "lysfisk-voksen": [.09, .42], // lampen
    "hval-unge": [.38, .04], "hval-voksen": [.35, .19], // pustehullet
    "havskildpadde-unge": [.62, .08], "havskildpadde-voksen": [.56, .04], // toppen af skjoldet
  };
  const BLAEK_FARVER = ["#ff5fa2", "#22c3b0", "#ff9f1c"];
  const FLAGE_FARVER = ["#ff9f43", "#ffd166", "#ef6f6c", "#8ac926", "#f4a259"];

  // Pynt på bunden: u = vandret plads (brøkdel af bredden), z = dybde, d = størrelse, sv = hvor meget den svajer
  const PYNT = [
    { n: "tang", u: .66, z: .02, d: 1.15, sv: .05 },
    { n: "tang", u: .34, z: .1, d: 1.35, sv: .05 },
    { n: "sten-koral", u: .13, z: .22, d: 1.25, sv: 0, sten: 1 },
    { n: "tang", u: .91, z: .22, d: 1.8, sv: .055 },
    { n: "tang", u: .04, z: .32, d: 1.7, sv: .06 },
    { n: "koral-roed", u: .8, z: .42, d: 1.45, sv: .012, koral: 1 },
    { n: "skattekiste", u: .55, z: .55, d: 1.25, sv: 0, kiste: 1 },
    { n: "muslinge", u: .3, z: .8, d: .8, sv: 0, musling: 1 },
    { n: "tang", u: .99, z: 1.08, d: 2.1, sv: .045 },
  ];

  /* ---------- Billeder og små tegninger (laves én gang) ---------- */
  const BILLEDER = {};
  function billede(n) {
    if (!BILLEDER[n]) { const i = new Image(); i.decoding = "async"; i.src = STI + n + ".webp"; BILLEDER[n] = i; }
    return BILLEDER[n];
  }
  const klar = i => i && i.complete && i.naturalWidth > 0;
  const alleBilleder = () => [...ARTER.flatMap(a => [a.k + "-unge", a.k + "-voksen"]), "koral-roed", "tang", "skattekiste", "muslinge", "sten-koral"];

  // Blækspruttens farveskift: samme billede, ny farvetone ("hue"), men samme lys og skygge
  const FARVET = {};
  function farvet(n, farve) {
    const key = n + farve;
    if (FARVET[key]) return FARVET[key];
    const i = billede(n); if (!klar(i)) return null;
    const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(i, 0, 0);
    g.globalCompositeOperation = "hue"; g.fillStyle = farve; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in"; g.drawImage(i, 0, 0);
    return (FARVET[key] = c);
  }

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    const mk = (s, fn) => { const c = document.createElement("canvas"); c.width = c.height = s; fn(c.getContext("2d"), s); return c; };
    const blød = f => mk(64, g => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, f(1)); r.addColorStop(.35, f(.5)); r.addColorStop(1, f(0)); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    });
    SPR = {
      boble: mk(64, g => {
        const r = g.createRadialGradient(27, 25, 2, 32, 32, 31);
        r.addColorStop(0, "rgba(255,255,255,.28)"); r.addColorStop(.65, "rgba(190,240,255,.1)");
        r.addColorStop(.9, "rgba(255,255,255,.7)"); r.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = r; g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(22, 20, 7, 4.5, -.6, 0, TAU); g.fill();
      }),
      guld: mk(128, g => {
        const r = g.createRadialGradient(54, 50, 4, 64, 64, 62);
        r.addColorStop(0, "rgba(255,250,215,.55)"); r.addColorStop(.6, "rgba(255,214,90,.35)");
        r.addColorStop(.88, "rgba(255,196,40,.95)"); r.addColorStop(1, "rgba(255,190,40,0)");
        g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill();
        // perlen indeni
        const p = g.createRadialGradient(58, 58, 2, 64, 66, 26);
        p.addColorStop(0, "#fff"); p.addColorStop(.35, "#f8f4ff"); p.addColorStop(.8, "#d8cdee"); p.addColorStop(1, "#b3a6d6");
        g.fillStyle = p; g.beginPath(); g.arc(64, 66, 24, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(42, 36, 13, 7, -.7, 0, TAU); g.fill();
        g.strokeStyle = "rgba(255,240,170,.9)"; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 57, .3, 1.5); g.stroke();
      }),
      stjerne: mk(64, g => {
        const r = g.createRadialGradient(32, 32, 0, 32, 32, 30);
        r.addColorStop(0, "rgba(255,255,230,.9)"); r.addColorStop(.3, "rgba(255,230,140,.35)"); r.addColorStop(1, "rgba(255,220,120,0)");
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
        g.fillStyle = "#fff"; g.beginPath();
        g.moveTo(32, 4); g.quadraticCurveTo(35, 29, 60, 32); g.quadraticCurveTo(35, 35, 32, 60);
        g.quadraticCurveTo(29, 35, 4, 32); g.quadraticCurveTo(29, 29, 32, 4); g.fill();
      }),
      hvid: blød(a => `rgba(255,255,255,${a})`),
      gul: blød(a => `rgba(255,214,110,${a})`),
      rosa: blød(a => `rgba(255,140,215,${a})`),
      blaek: blød(a => `rgba(58,28,88,${a})`),
      skygge: blød(a => `rgba(20,40,60,${a})`),
      kaustik: [kaustik(3), kaustik(11)],
    };
    return SPR;
  }

  // Lysmønster på sandet: Voronoi-celler (afstand til nærmeste minus næstnærmeste punkt), som kan gentages som fliser
  function kaustik(seed) {
    const N = 192, c = document.createElement("canvas"); c.width = c.height = N;
    const g = c.getContext("2d"), im = g.createImageData(N, N), d = im.data;
    let s = seed;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const P = Array.from({ length: 13 }, () => [r(), r()]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; let f1 = 9, f2 = 9;
      for (const [px, py] of P) {
        let dx = Math.abs(u - px), dy = Math.abs(v - py);
        if (dx > .5) dx = 1 - dx; if (dy > .5) dy = 1 - dy;
        const dd = dx * dx + dy * dy;
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1), a = Math.pow(clamp(1 - e * 11, 0, 1), 2.6);
      const i = (y * N + x) * 4; d[i] = 255; d[i + 1] = 252; d[i + 2] = 220; d[i + 3] = a * 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  /* ---------- CSS ---------- */
  Spil.css("css-akvariet", `
    .ak{position:relative;height:100%;overflow:hidden;overflow:clip;touch-action:none;background:#2a9fd8;
      --akk:clamp(60px,min(9vh,16vw),84px);--akp:clamp(28px,min(5.6vh,7.6vw),50px)}
    .ak canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
    .ak-knap{position:absolute;z-index:6;top:calc(2vh + env(safe-area-inset-top,0px));width:var(--akk);height:var(--akk);border-radius:50%;padding:0;
      background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.25);font-size:calc(var(--akk) * .5);line-height:1;display:grid;place-items:center}
    .ak-knap:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    .ak-bogknap,.ak-luk{right:max(16px,env(safe-area-inset-right,0px))}
    .ak-natknap{right:calc(max(16px,env(safe-area-inset-right,0px)) + var(--akk) + 12px)}
    .ak-natknap.nat{background:#24345f}
    @media (orientation:portrait){.ak-natknap{top:auto;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(2vh + env(safe-area-inset-bottom,0px))}}
    .ak-bogknap.ny{animation:ak-puls 1.2s ease-in-out infinite}
    .ak-bogknap.ny::after{content:"";position:absolute;top:2%;right:2%;width:26%;height:26%;border-radius:50%;background:#ffc93c;box-shadow:0 0 0 3px #fff}
    @keyframes ak-puls{50%{transform:scale(1.12)}}
    .ak-skal{position:absolute;z-index:5;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);height:var(--akk);box-sizing:border-box;
      display:flex;align-items:center;gap:calc(var(--akp) * .22);padding:0 calc(var(--akp) * .5);border-radius:999px;pointer-events:none;
      background:radial-gradient(120% 150% at 50% -30%,#fff6fa 0 35%,#ffd3e3 68%,#f4a6c4 100%);
      box-shadow:0 5px 0 rgba(150,60,100,.28),inset 0 -5px 0 rgba(214,110,156,.28),inset 0 3px 0 rgba(255,255,255,.7)}
    .ak-skal{transition:opacity .4s}.ak-pust .ak-skal{opacity:.15}
    .ak-perle{width:var(--akp);height:var(--akp);border-radius:50%;background:rgba(160,70,110,.16);box-shadow:inset 0 3px 5px rgba(120,40,80,.3)}
    .ak-perle.fuld,.ak-flyv{background:radial-gradient(circle at 34% 30%,#fff 0 14%,#f8f4ff 30%,#ddd3f2 64%,#b3a6d6 100%)}
    .ak-perle.fuld{box-shadow:0 2px 0 rgba(120,60,110,.25),0 0 14px rgba(255,255,255,.9)}
    .ak-perle.hop{animation:ak-hop .5s cubic-bezier(.3,1.8,.5,1)}
    @keyframes ak-hop{from{transform:scale(.2)}}
    .ak-flyv{position:absolute;left:0;top:0;width:var(--akp);height:var(--akp);margin:calc(var(--akp) * -.5) 0 0 calc(var(--akp) * -.5);
      border-radius:50%;z-index:7;pointer-events:none;box-shadow:0 0 18px 6px rgba(255,236,170,.9)}
    .ak-navn{position:absolute;left:50%;z-index:5;transform:translateX(-50%);pointer-events:none;white-space:nowrap;font-weight:800;
      font-size:clamp(32px,7vh,68px);color:#fff;text-shadow:0 4px 0 rgba(10,40,90,.45),0 0 30px rgba(255,220,120,.9);opacity:0;transition:opacity .5s}
    .ak-navn.vis{opacity:1;animation:ak-navn .7s cubic-bezier(.3,1.6,.5,1)}
    @keyframes ak-navn{from{transform:translateX(-50%) scale(.3)}}
    .ak-haand{position:absolute;z-index:4;pointer-events:none;font-size:clamp(46px,8vh,76px);line-height:1;margin-left:-.5em;
      animation:ak-haand 1.4s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(0,30,60,.35))}
    @keyframes ak-haand{0%,100%{transform:translateY(18px)}50%{transform:translateY(-4px) scale(.92)}}
    .ak-bog{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;box-sizing:border-box;background:rgba(6,28,64,.55);
      padding:calc(env(safe-area-inset-top,0px) + 8px) max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 8px) max(12px,env(safe-area-inset-left,0px));
      --g:clamp(8px,1.4vmin,16px);--k:min(calc((100vw - 130px - 4 * var(--g)) / 5),calc((100vh - 150px - 2 * var(--g)) / 3))}
    .ak-bog[hidden]{display:none}
    @media (orientation:portrait){.ak-bog{--k:min(calc((100vw - 64px - 2 * var(--g)) / 3),calc((100vh - 250px - 4 * var(--g)) / 5))}}
    .ak-side{background:linear-gradient(#fffdf7,#e3f4ff);border-radius:32px;padding:calc(var(--g) * 1.3);box-shadow:0 10px 0 rgba(10,40,80,.35);
      animation:ak-bog .35s cubic-bezier(.3,1.4,.5,1)}
    @keyframes ak-bog{from{transform:scale(.85);opacity:0}}
    .ak-titel{display:block;text-align:center;font-weight:800;font-size:clamp(24px,5vh,44px);line-height:1.1;color:var(--ink);margin:0 0 var(--g)}
    .ak-gitter{display:grid;grid-template-columns:repeat(5,var(--k));gap:var(--g)}
    @media (orientation:portrait){.ak-gitter{grid-template-columns:repeat(3,var(--k))}}
    .ak-kort{position:relative;width:var(--k);height:var(--k);border-radius:20px;padding:0;overflow:hidden;
      background:radial-gradient(circle at 50% 38%,#d4f4ff,#86cff2 62%,#4aa6dc);box-shadow:0 5px 0 rgba(20,70,120,.3);
      display:flex;flex-direction:column;align-items:center;justify-content:center}
    .ak-kort:active{transform:translateY(3px)}
    .ak-kort img{width:80%;height:58%;object-fit:contain;filter:drop-shadow(0 3px 2px rgba(0,30,60,.25))}
    .ak-kort-navn{font-weight:800;font-size:calc(var(--k) * .12);line-height:1.1;color:#fff;text-shadow:0 2px 0 rgba(10,50,90,.5);margin-top:4%}
    .ak-prikker{display:flex;gap:calc(var(--k) * .025);margin-top:3%}
    .ak-prikker i{width:calc(var(--k) * .065);height:calc(var(--k) * .065);border-radius:50%;background:rgba(255,255,255,.4)}
    .ak-prikker i.fuld{background:#ffc93c;box-shadow:0 0 0 2px #fff}
    .ak-stjerne{position:absolute;top:5%;right:6%;font-size:calc(var(--k) * .17);line-height:1}
    .ak-ungemaerke{position:absolute;top:5%;left:6%;font-size:calc(var(--k) * .17);line-height:1}
    .ak-kort.sil{background:radial-gradient(circle at 50% 40%,#5f7f9c,#2c4865)}
    .ak-kort.sil img{filter:brightness(0) opacity(.42)}
    .ak-sp{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:calc(var(--k) * .42);color:rgba(255,255,255,.88);text-shadow:0 3px 0 rgba(0,0,0,.25)}
    .ak-kort.ny{box-shadow:0 0 0 4px #ffc93c,0 0 22px 6px rgba(255,201,60,.8)}
    .ak-kort.ak-vipper{animation:ak-vip .4s}
    @keyframes ak-vip{25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
    .ak-luk{z-index:9}
    /* Fakta-siden: ingen hvid boks. Fisken og teksten ligger direkte på mørkt vand, der dækker hele skærmen.
       Alle mål er faste (vw/vh), ikke procent af en foraelder, så fisken aldrig kan vokse ind over teksten. */
    .ak-side[hidden]{display:none}
    .ak-fakta{position:absolute;inset:0;z-index:2;box-sizing:border-box;background:radial-gradient(120% 90% at 50% 40%,rgba(8,46,96,.9),rgba(3,18,44,.96));
      --fk:min(40vw,62vh);padding:calc(env(safe-area-inset-top,0px) + var(--akk) + 4vh) max(5vw,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 4vh) max(5vw,env(safe-area-inset-left,0px));
      display:flex;align-items:center;justify-content:center;gap:4vw;animation:ak-fk-ind .3s ease-out}
    @keyframes ak-fk-ind{from{opacity:0}}
    .ak-fakta[hidden]{display:none}
    .ak-fk-billede{flex:none;width:var(--fk);height:var(--fk);padding:0;background:none;border-radius:50%;display:grid;place-items:center}
    .ak-fk-billede img{display:block;width:var(--fk);height:var(--fk);max-width:none;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}
    .ak-fk-billede.ak-vipper img{animation:ak-vip .4s}
    .ak-fk-billede.lille img{width:calc(var(--fk) * .7);height:calc(var(--fk) * .7)}
    .ak-fk-tekst{flex:0 1 auto;min-width:0;max-width:min(46vw,640px);display:flex;flex-direction:column;align-items:flex-start;gap:2.2vh;color:#fff}
    .ak-fk-navn{font-weight:800;font-size:clamp(30px,7vh,76px);line-height:1;text-shadow:0 4px 0 rgba(0,20,50,.5)}
    .ak-fk-fakta{margin:0;font-weight:600;font-size:clamp(18px,3.4vh,34px);line-height:1.3;text-wrap:pretty;text-shadow:0 2px 6px rgba(0,0,0,.5);min-height:2.6em}
    .ak-fk-prikker{display:flex;gap:10px}
    .ak-fk-prikker i{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.3)}
    .ak-fk-prikker i.fuld{background:#ffc93c}
    .ak-fk-knapper{display:flex;gap:2vw;margin-top:1vh}
    .ak-fk-knapper button{width:var(--akk);height:var(--akk);border-radius:50%;padding:0;font-size:calc(var(--akk) * .5);line-height:1;
      display:grid;place-items:center;background:#fff;box-shadow:0 5px 0 rgba(0,20,50,.4)}
    .ak-fk-knapper .ak-fk-mere{background:var(--sun);box-shadow:0 5px 0 #b8860b}
    .ak-fk-knapper button:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,20,50,.4)}
    @media (orientation:portrait){
      .ak-fakta{flex-direction:column;gap:3vh;--fk:min(72vw,36vh);text-align:center}
      .ak-fk-tekst{max-width:88vw;align-items:center}
      .ak-fk-knapper{gap:5vw}
    }
    @media (prefers-reduced-motion:reduce){.ak-fakta,.ak-fk-billede.ak-vipper img{animation:none!important}}
    @media (prefers-reduced-motion:reduce){.ak-haand,.ak-bogknap.ny,.ak-navn.vis,.ak-side,.ak-perle.hop,.ak-kort.ak-vipper{animation:none!important}}
  `);

  /* ---------- Tilstand ---------- */
  let root, cv, cx, bgCv, bg, morkCv, mork, lysCv, lysG, alive, timers, raf, lastT, T;
  let W = 1, H = 1, dpr = 1, kval = 2, surfY = 100, floorY = 600, S = 150, portrait = false;
  let fish, flakes, bubbles, golds, bigs, parts, ripples, decos, kiste, koral, sorteret, aegs = [];
  let gem, demo, hoert, night, nightF, dimLocal, dimF, dimT, scene, bogOpen, pointer, sidstRort, hintN, nextGold, sidstGuld, paaVej;
  let maetSagt = false, alleSoverT = -99, udeUr = 0, hjaelpUr = 24;
  let tidsFaktor = 1, skrift = "sans-serif", haandVist, vokseHint, perleHint, kisteHint, nextSelv, frameStat, bobleUr, hazeGrad, sandTop, stjerner, natUr;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  // Sig noget, når den igangværende replik er talt færdig (så fx "Saml fem perler ..." ikke klippes over af et fiskenavn)
  function naarStille(fn, maks = 6000) { const t0 = Date.now(); const tjek = () => { if (!Spil.isTalking() || Date.now() - t0 > maks) fn(); else later(tjek, 150); }; tjek(); }
  const q = s => root.querySelector(s);

  function hent() {
    try { const g = JSON.parse(localStorage.getItem("lk-akvariet")); if (g && Array.isArray(g.fundet)) return g; } catch (e) {}
    return null;
  }
  function gemNu() { if (demo) return; try { localStorage.setItem("lk-akvariet", JSON.stringify(gem)); } catch (e) {} }

  /* ---------- Lyd (små synth-lyde, bløde) ---------- */
  let master = null, stoej = null;
  function ud() {
    const a = Spil.audio();
    if (!master) { master = a.createGain(); master.gain.value = .9; master.connect(a.destination); }
    return a;
  }
  function tone(type, f0, f1, t0, dur, peak = .12, lp = 0, vib = null) {
    try {
      const a = ud(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.04, dur * .3));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      let n = o;
      if (lp) { const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); n = fl; }
      if (vib) {
        const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1];
        l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .05);
      }
      n.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
    } catch (e) {}
  }
  function sus(t0, dur, f0, f1, peak = .1, Q = 1.2) {
    try {
      const a = ud();
      if (!stoej || stoej.sampleRate !== a.sampleRate) {
        stoej = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        const d = stoej.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = a.currentTime + t0, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
      s.buffer = stoej; s.loop = true; fl.type = "bandpass"; fl.Q.value = Q; fl.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.05, dur * .3));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
    } catch (e) {}
  }
  const LYD = {
    nam() { tone("sine", 240, 420, 0, .06, .1, 1500); tone("sine", 460, 280, .06, .14, .13, 1500); },
    blop() { tone("sine", 480 + Math.random() * 200, 1300, 0, .07, .07); },
    drys() { sus(0, .18, 5200, 6500, .035, 2); sus(.08, .14, 4200, 5200, .025, 2); },
    plop() { tone("sine", 170, 560, 0, .2, .2); [1319, 1568, 2093, 2637].forEach((f, i) => tone("sine", f, f, .16 + i * .07, .35, .05)); },
    ding(n) { const f = 660 * Math.pow(1.122, n); tone("sine", f, f, 0, .6, .13); tone("triangle", f * 2, f * 2, 0, .35, .035); },
    guldPop() { tone("sine", 700, 1700, 0, .1, .12); sus(0, .16, 3000, 5200, .05, 1.5); },
    guldKom() { [988, 1319].forEach((f, i) => tone("sine", f, f, i * .12, .5, .04)); },
    rumle() { tone("triangle", 62, 118, 0, 1.6, .2, 420, [9, 6]); sus(0, 1.6, 180, 520, .08, .9); },
    brag() {
      sus(0, 1, 500, 2600, .16, .6); tone("sine", 90, 50, 0, .5, .25);
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone("sine", f, f, .08 + i * .09, .7, .07));
      tone("triangle", 262, 262, .1, 1.1, .06);
    },
    plask(stort) { sus(0, stort ? .6 : .4, 1900, 380, stort ? .2 : .13, .8); sus(.04, .3, 3600, 1600, .06, 1); },
    pust() { sus(0, 1.8, 700, 2600, .1, .6); tone("sine", 130, 196, 0, 1, .11, 0, [5, 4]); tone("sine", 196, 110, 1, 1.1, .09, 0, [5, 4]); },
    pfft() { sus(0, .4, 900, 300, .14, .8); tone("sine", 320, 170, .4, .12, .08); tone("sine", 360, 190, .58, .12, .07); },
    pusOp() { tone("sine", 170, 560, 0, .45, .12, 0, [18, 14]); },
    pusUd() { tone("triangle", 880, 260, 0, 1.6, .04, 0, [12, 18]); sus(0, 1.5, 2400, 900, .025, 3); },
    klik() { sus(0, .035, 3600, 3600, .16, 7); sus(.07, .035, 4200, 4200, .14, 7); },
    bop(n) { const f = [220, 330, 262, 392][n % 4]; tone("triangle", f, f, 0, .16, .09, 1200); },
    glimt() { [1319, 1760, 2093, 2637].forEach((f, i) => tone("sine", f, f, i * .09, .7, .035)); },
    tutu() { [523, 659, 784, 659, 523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, f, i * .19, .17, .07, 2400)); },
    hop() { tone("sine", 300, 700, 0, .25, .1); },
    sug() { tone("sine", 900, 220, 0, .12, .12); sus(0, .08, 1500, 900, .06, 2); },
    knirk() { tone("sine", 1500, 1000, 0, 1.6, .022, 0, [7, 30]); },
    puls(n) { const f = [660, 784, 988, 1175][n % 4]; tone("sine", f, f, 0, .5, .07); tone("sine", f * 1.5, f * 1.5, .04, .4, .025); },
    sus() { sus(0, .9, 400, 1700, .1, .7); sus(.9, .6, 1700, 500, .08, .7); },
    hehe() { tone("triangle", 660, 720, 0, .1, .09); tone("triangle", 880, 960, .15, .1, .09); },
    hurtig() { sus(0, 1.2, 500, 2000, .08, .7); [523, 659, 784, 1047, 784].forEach((f, i) => tone("triangle", f, f, .3 + i * .14, .14, .06, 2400)); },
    vip() { [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone("sine", f, f, i * .11, .25, .055)); },
    tit() { tone("sine", 880, 1180, 0, .1, .08); },
    tittut() { tone("sine", 784, 784, 0, .13, .1); tone("sine", 1047, 1047, .17, .22, .1); },
    blub() { tone("sine", 330, 170, 0, .9, .1, 0, [7, 16]); },
    zig(n) { const f = n % 2 ? 660 : 880; tone("triangle", f, f, 0, .08, .06, 2600); },
    skraek() { tone("sine", 320, 160, 0, .12, .08); },
    nat() { [784, 659, 523, 392].forEach((f, i) => tone("sine", f, f, i * .32, .9, .06)); },
    dag() { [523, 659, 784, 1047].forEach((f, i) => tone("sine", f, f, i * .14, .45, .07)); },
    side() { tone("sine", 600, 900, 0, .12, .07); sus(0, .2, 2500, 1500, .03, 1); },
    svup() { sus(0, .35, 700, 1400, .05, 1); },
  };

  /* ---------- Opsætning og mål ---------- */
  const sandY = z => lerp(floorY + (H - floorY) * .2, H - (H - floorY) * .18, clamp(z, 0, 1.1));
  const madZone = () => surfY + Math.max(44, H * .075);

  function maal() {
    W = root.clientWidth || 1; H = root.clientHeight || 1; portrait = H > W;
    dpr = Math.min(kval, window.devicePixelRatio || 1);
    for (const c of [cv, bgCv]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    morkCv.width = Math.ceil(W / 4); morkCv.height = Math.ceil(H / 4);
    lysCv.width = Math.ceil(W / 2); lysCv.height = Math.ceil((H - floorY + H * .05) / 2);
    const rt = root.getBoundingClientRect().top;
    let ui = 0;
    root.querySelectorAll(".ak-top").forEach(e => { const r = e.getBoundingClientRect(); if (r.top - rt < H / 2) ui = Math.max(ui, r.bottom - rt); });
    surfY = Math.round(Math.max(H * .11, ui + H * .03));
    floorY = H * (portrait ? .8 : .77);
    S = Math.min(H * .19, W * .27);
    // Sandets øverste kant: en blød bølge
    sandTop = [];
    for (let i = 0; i <= 24; i++) { const x = i / 24 * W; sandTop.push([x, floorY + Math.sin(i * .9) * H * .008 + Math.sin(i * .37 + 1) * H * .012]); }
    hazeGrad = null;
    stjerner = Array.from({ length: 26 }, (_, i) => [((i * 0.6180339 * 7) % 1) * W, (.15 + ((i * .37) % 1) * .7) * surfY, .6 + (i % 3) * .5, i]);
    placerPynt();
    tegnBaggrund();
    if (fish) fish.forEach(f => { f.x = clamp(f.x, 20, W - 20); f.y = clamp(f.y, surfY + 20, H - 20); nytMaal(f); });
    const n = q(".ak-navn"); if (n) n.style.top = (surfY + 8) + "px";
    const h = q(".ak-haand"); if (h) { h.style.left = (W * (portrait ? .5 : .42)) + "px"; h.style.top = (surfY + 6) + "px"; }
  }

  function placerPynt() {
    decos = PYNT.map((p, i) => {
      const img = billede(p.n), ar = klar(img) ? img.naturalHeight / img.naturalWidth : 1;
      const d = S * p.d * (.6 + .4 * Math.min(p.z, 1.1));
      const w = ar > 1 ? d / ar : d, h = ar > 1 ? d : d * ar;
      const old = decos && decos[i];
      return Object.assign({ ...p, img, w, h, x: p.u * W, by: sandY(p.z) + h * .04, f: i * 1.7, wig: 0, shake: 0, glow: 0, open: 0, openT: 0, front: false },
        old ? { wig: old.wig, open: old.open, openT: old.openT } : {});
    });
    kiste = decos.find(d => d.kiste); koral = decos.find(d => d.koral);
  }

  function sandSti(g) {
    g.moveTo(0, H); g.lineTo(0, sandTop[0][1]);
    for (let i = 1; i < sandTop.length; i++) {
      const [x0, y0] = sandTop[i - 1], [x1, y1] = sandTop[i];
      g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    g.lineTo(W, sandTop[sandTop.length - 1][1]); g.lineTo(W, H); g.closePath();
  }

  // Den faste baggrund (tegnes kun ved start og ny skærmstørrelse)
  function tegnBaggrund() {
    const g = bg; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let gr = g.createLinearGradient(0, 0, 0, surfY);
    gr.addColorStop(0, "#eefaff"); gr.addColorStop(1, "#c4ebfb");
    g.fillStyle = gr; g.fillRect(0, 0, W, surfY + 2);
    gr = g.createLinearGradient(0, surfY, 0, H);
    gr.addColorStop(0, "#74d8f2"); gr.addColorStop(.22, "#43b6e2"); gr.addColorStop(.5, "#2189c8");
    gr.addColorStop(.8, "#13619f"); gr.addColorStop(1, "#0e4d86");
    g.fillStyle = gr; g.fillRect(0, surfY, W, H - surfY);
    // fjerne rev og klipper, som forsvinder i det blå
    let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    [["rgba(18,86,146,.32)", .16, 22], ["rgba(16,96,156,.35)", .09, 15]].forEach(([c, hh, n]) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, floorY + 10);
      for (let i = 0; i <= n; i++) {
        const x = i / n * W, y = floorY - H * hh * (.4 + .6 * r());
        g.quadraticCurveTo(x - W / n / 2, y - H * .03 * r(), x, y + H * .01);
      }
      g.lineTo(W, floorY + 10); g.closePath(); g.fill();
    });
    // sandbunden
    g.save(); g.beginPath(); sandSti(g); g.clip();
    gr = g.createLinearGradient(0, floorY - H * .02, 0, H);
    gr.addColorStop(0, "#d9c999"); gr.addColorStop(.25, "#ecd8a2"); gr.addColorStop(.7, "#e0bf80"); gr.addColorStop(1, "#c99c5f");
    g.fillStyle = gr; g.fillRect(0, floorY - H * .05, W, H);
    // bølgeriller i sandet
    g.strokeStyle = "rgba(160,118,62,.18)"; g.lineWidth = Math.max(1.5, S * .012); g.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      const y = lerp(floorY + H * .03, H - H * .02, i / 8), x0 = r() * W * .3;
      g.beginPath(); g.moveTo(x0, y);
      for (let x = x0; x < W; x += S * .9) g.quadraticCurveTo(x + S * .22, y - S * .05, x + S * .45, y);
      g.stroke();
    }
    // småsten og skaller
    const sten = ["#b9a78e", "#d8c7a7", "#9b8b78", "#f4ead0", "#c7b08a", "#e8c9b0"];
    for (let i = 0; i < 70; i++) {
      const y = lerp(floorY + H * .02, H, r()), k = (y - floorY) / (H - floorY);
      g.fillStyle = sten[i % sten.length]; g.beginPath();
      g.ellipse(r() * W, y, S * (.015 + .03 * r()) * (.5 + k), S * (.01 + .018 * r()) * (.5 + k), r() * 3, 0, TAU); g.fill();
    }
    // det fjerne sand forsvinder i vandet
    gr = g.createLinearGradient(0, floorY - H * .02, 0, floorY + (H - floorY) * .45);
    gr.addColorStop(0, "rgba(40,130,190,.55)"); gr.addColorStop(1, "rgba(40,130,190,0)");
    g.fillStyle = gr; g.fillRect(0, floorY - H * .05, W, H);
    g.restore();
    // glasset: et svagt genskin og mørkere hjørner
    g.fillStyle = "rgba(255,255,255,.05)"; g.beginPath();
    g.moveTo(W * .78, surfY); g.lineTo(W * .86, surfY); g.lineTo(W * .7, H); g.lineTo(W * .6, H); g.closePath(); g.fill();
    gr = g.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .8);
    gr.addColorStop(0, "rgba(0,20,50,0)"); gr.addColorStop(1, "rgba(0,20,50,.32)");
    g.fillStyle = gr; g.fillRect(0, surfY, W, H - surfY);
  }

  /* ---------- Dyr ---------- */
  // mor = foraelderen, hvis fisken er en unge, der lige er klækket
  function nyFisk(k, x, y, mor) {
    const a = ART[k], m = mor ? 0 : gem.mad[k] || 0;
    const f = {
      a, k, x: x ?? rnd(W * .15, W * .85), y: y ?? rnd(surfY + S, floorY - S * .3), z: nyDybde(), vx: 0, vy: 0,
      dir: Math.random() < .5 ? -1 : 1, dirS: 0, rot: 0, mr: 0, mx: 1, my: 1, bob: 0, ph: rnd(0, TAU), bp: rnd(0, TAU), slagX: 1, slagY: 1,
      w: S, h: S * .7, tx: 0, ty: 0, tz: .5, wt: 0, hvil: 0, skraek: 0, pause: 0, spd: 1, mad: m, grown: !mor && m >= VOKS, lurTil: mor ? 0 : (gem.lur && gem.lur[k]) || 0, growT: -1, eatT: 0,
      unge: !!mor, mor: mor || null, ind: 1,
      spot: 0, spotT: 0, heroS: 1, trick: null, ride: null, scene: false, over: false, glow: 0, tint: 0, tintA: 0, laas: false, drej: null,
      sovY: 0, zUr: rnd(2, 6), selvUr: 0, rul: -1, pulsLaas: false,
    };
    if (a.front) { f.dir = -1; f.dirS = -1; } else f.dirS = f.dir;
    f.tz = f.z; dims(f); nytMaal(f);
    if (a.slags === "krabbe" || a.slags === "stjerne") { f.z = f.tz = rnd(.45, .95); dims(f); f.y = sandY(f.z) - f.h * .42; }
    return f;
  }

  // Fiskens størrelse: grundstørrelse × art × (unge/voksen) × dybde × spotlys
  function dims(f) {
    const vok = f.growT >= 0 ? fjeder(f.growT) : f.grown ? 1 : 0;
    const d = S * f.a.str * lerp(.68, 1, vok) * (f.unge ? UNGE_STR : 1) * (.5 + .5 * clamp(f.z, 0, 1)) * lerp(1, f.heroS, f.spot);
    const img = billede(f.k + (f.grown ? "-voksen" : "-unge")), ar = klar(img) ? img.naturalHeight / img.naturalWidth : .7;
    f.d = d;
    if (ar > 1) { f.h = d; f.w = d / ar; } else { f.w = d; f.h = d * ar; }
  }

  // Mange dyr holder sig langt tilbage (små og blålige); kun nogle få kommer helt frem ad gangen
  function nyDybde() { const u = Math.random(); return u < .3 ? rnd(.08, .3) : u < .75 ? rnd(.3, .65) : rnd(.65, .95); }
  function nytMaal(f) {
    const a = f.a, z = a.zone || [.2, .8];
    const top = surfY + f.h * .6, bund = sandY(f.z) - f.h * .55;
    f.tx = rnd(f.w * .5, W - f.w * .5);
    f.ty = lerp(top, Math.max(top, bund), rnd(z[0], z[1]));
    f.wt = rnd(3, 8);
    if (Math.random() < .3) f.tz = nyDybde();
    if (Math.random() < .25) f.hvil = rnd(1, 2.5);
  }

  // Punkt i billedet (u, v som brøkdel, billedet vender mod venstre) → punkt på skærmen
  function lokal(f, u, v) {
    let lx = (u - .5) * f.w * Math.abs(f.mx), ly = (v - .5) * f.h * f.my;
    if (f.dirS * Math.sign(f.mx || 1) > 0) lx = -lx;
    const r = f.rot + f.mr, c = Math.cos(r), s = Math.sin(r);
    return [f.x + lx * c - ly * s, f.y + f.bob + lx * s + ly * c];
  }
  const mund = f => f.a.front ? [f.x + f.a.mund[0] * f.w, f.y + f.bob + f.a.mund[1] * f.h] : lokal(f, .5 - f.a.mund[0], .5 + f.a.mund[1]);
  const anker = f => ANKER[f.k + (f.grown ? "-voksen" : "-unge")] || [.5, .5];

  function naermesteFlage(f, bund, range) {
    let best = null, bd = range * range;
    const [mx, my] = mund(f);
    for (const fl of flakes) {
      if (fl.dead) continue;
      if (bund && fl.y < sandY(fl.z) - S * .9) continue;
      if (!bund && fl.pille) continue; // pillerne er til bunddyrene
      const dx = fl.x - mx, dy = fl.y - my, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = fl; }
    }
    return best;
  }

  // Ungens plads: lige bag sin mor eller far. null, hvis foraelderen ikke er i akvariet eller står i spotlyset.
  function foelg(f) {
    const m = f.mor;
    if (!m || m.scene || vaek(m) || !fish.includes(m)) return null;
    const bag = m.a.front ? (f.x < m.x ? -1 : 1) : -m.dir;
    return [m.x + bag * (m.w * .55 + f.w * .35), m.y + m.h * .18];
  }

  function nysgerrig() { return pointer && pointer.mode === "vand" && T - pointer.t0 > .28 ? pointer : null; }

  // Svømmere: blød styring mod et mål (mad, fingeren, en sovepladS eller en tilfældig plads), med adskillelse og lidt flok
  function svoem(f, dt) {
    const a = f.a, sl = a.slags, sover = nightF > .5 && !a.lys;
    let tx = f.tx, ty = f.ty, fart = a.fart * S * f.spd * (.6 + .4 * clamp(f.z, 0, 1)), ankomst = S * .7;
    f.wt -= dt;
    const ude = f.ude && !f.ude.ret;
    const fl = maet(f) || ude ? null : naermesteFlage(f, false, sover ? S * 2 : S * 9);
    const fing = !fl && !sover && nysgerrig();
    const mp = !fl && !sover && f.unge ? foelg(f) : null;
    if (f.ude && !mp) {
      // på vej ud af billedet, eller ind igen
      const u = f.ude;
      if (!u.ret) { tx = u.side < 0 ? -f.w * 1.3 : W + f.w * 1.3; ty = u.y; if (f.x < -f.w * .9 || f.x > W + f.w * .9) u.vaek = T; }
      else { tx = u.mx; ty = u.y; if (f.x > f.w * .5 && f.x < W - f.w * .5) f.ude = null; }
      f.hvil = 0;
    } else if (fl) {
      tx = fl.x - (a.front ? 0 : f.dir * a.mund[0] * f.w); ty = fl.y - a.mund[1] * f.h;
      fart *= sover ? .8 : 2.1; ankomst = S * .15; f.hvil = 0;
    } else if (fing && Math.hypot(fing.x - f.x, fing.y - f.y) < S * 4.5) {
      const dx = f.x - fing.x, dy = f.y - fing.y, d = Math.hypot(dx, dy) || 1, stop = f.w * .55 + S * .35;
      tx = fing.x + dx / d * stop; ty = fing.y + dy / d * stop * .6; fart *= .55; ankomst = S * .5;
      if (d < stop * 1.4 && !a.front) { f.dir = fing.x > f.x ? 1 : -1; f.laas = true; }
    } else if (mp) {
      tx = mp[0]; ty = mp[1]; f.tz = clamp(f.mor.z + .03, 0, 1); fart *= 1.3; ankomst = S * .6; f.hvil = 0;
    } else if (sover) {
      if (!f.sovY) f.sovY = sandY(f.z) - f.h * .6 - rnd(0, S * .25);
      ty = f.sovY; fart *= Math.abs(ty - f.y) > S * .5 ? .6 : .18;
      if (Math.abs(f.tx - f.x) < S * .3 || f.wt <= 0) { f.tx = clamp(f.x + rnd(-1, 1) * S, f.w * .5, W - f.w * .5); f.wt = rnd(5, 10); }
    } else {
      f.sovY = 0;
      if (f.wt <= 0 || Math.hypot(tx - f.x, ty - f.y) < S * .4) nytMaal(f);
      if (f.hvil > 0) { f.hvil -= dt; fart *= .15; }
    }
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
    let want = fart * Math.min(1, d / ankomst);
    // blækspruttens skub: farten kommer i pust
    if (sl === "blaek") { f.ph += dt * 2.4; const p = Math.max(0, Math.sin(f.ph)); want *= .25 + 1.7 * p * p; f.mx *= 1 + .05 * p; f.my *= 1 - .07 * p; }
    let dvx = dx / d * want, dvy = dy / d * want * .85;
    let ax = 0, ay = 0, n = 0;
    for (const o of fish) {
      if (o === f || o.ride || Math.abs(o.z - f.z) > .3) continue;
      const ox = f.x - o.x, oy = f.y - o.y, r = (f.w + o.w) * .4, dd = ox * ox + oy * oy;
      if (dd < r * r && dd > .01) { const l = Math.sqrt(dd), k = 1 - l / r; dvx += ox / l * k * S * 1.3; dvy += oy / l * k * S * .9; }
      if (sl === "fisk" && o.a.slags === "fisk" && dd < S * S * 2.5) { ax += o.vx; ay += o.vy; n++; }
    }
    if (n) { dvx = lerp(dvx, ax / n, .12); dvy = lerp(dvy, ay / n, .12); }
    const acc = f.skraek > 0 ? .7 : sl === "rokke" || sl === "hval" ? 1.1 : 1.7;
    f.vx += (dvx - f.vx) * Math.min(1, acc * dt);
    f.vy += (dvy - f.vy) * Math.min(1, acc * dt);
    // hver art har sin egen måde at svømme på
    if (sl === "soehest") { f.bob += Math.sin(f.bp * 1.2) * S * .07; f.mr += Math.sin(T * 1.3 + f.ph) * .06; }
    else if (sl === "skildpadde") f.mr += Math.sin(f.ph * .45) * .05;
    else if (sl === "rokke") { f.my *= 1 + .08 * Math.sin(f.ph * .6); f.mr += Math.sin(f.ph * .6 + 1) * .03; }
    else if (sl === "delfin") {
      // af og til en glad snurretur
      f.selvUr -= dt;
      if (f.selvUr <= 0) { f.selvUr = rnd(9, 18); if (!RM.matches && !sover) f.rul = 0; }
      if (f.rul >= 0) { f.rul += dt / .9; f.mx *= Math.cos(f.rul * TAU); if (f.rul >= 1) f.rul = -1; }
      if (!fl && Math.random() < dt * .4) f.ty = clamp(f.ty + rnd(-1, 1) * S, surfY + f.h, floorY - f.h);
    }
    if (!sover || a.lys) f.bob += Math.sin(f.bp) * S * .025; else f.bob += Math.sin(f.bp * .5) * S * .015;
  }

  // Vandmanden: trækker sig sammen og skyder op, og daler så langsomt ned
  function vandmand(f, dt) {
    const lang = 2.7;
    if (!f.pulsLaas) {
      const før = f.ph % lang; f.ph += dt * (nightF > .5 ? .8 : 1);
      if (f.ph % lang < før) f.vy -= S * (f.y < surfY + f.h * 1.2 ? .2 : .7);
    }
    const k = (f.ph % lang) / lang;
    f.mx *= 1 - .1 * bump(k, 0, .3) + .04 * bump(k, .3, 1); f.my *= 1 + .08 * bump(k, 0, .3) - .03 * bump(k, .3, 1);
    f.wt -= dt; if (f.wt <= 0) nytMaal(f);
    const fl = naermesteFlage(f, false, S * 3), mp = !fl && f.unge ? foelg(f) : null, tx = fl ? fl.x : mp ? mp[0] : f.tx;
    if (mp) f.tz = clamp(f.mor.z + .03, 0, 1);
    f.vx += ((tx - f.x) * .25 - f.vx) * dt * .8;
    f.vy += S * .22 * dt; f.vy *= 1 - dt * 1.1;
    if (f.y < surfY + f.h * .6) f.vy = Math.max(f.vy, 0);
    f.mr += f.vx / S * .25;
  }

  // Krabben går sidelæns på sandet, søstjernen kryber langsomt
  function bund(f, dt) {
    const krabbe = f.a.slags === "krabbe";
    f.wt -= dt;
    const fl = maet(f) ? null : naermesteFlage(f, true, S * 6);
    let tx = fl ? fl.x : f.tx;
    if (fl) f.tz = clamp(fl.z, .3, 1); // gå hen mod maden, også frem og tilbage på bunden
    if (!fl && f.wt <= 0) {
      f.tx = clamp(f.x + rnd(-1, 1) * S * (krabbe ? 3 : 1), f.w * .5, W - f.w * .5); f.wt = rnd(3, 7);
      f.pause = Math.random() < .5 ? rnd(1, 3) : 0; f.tz = clamp(f.tz + rnd(-.2, .2), .4, 1);
    }
    const mp = !fl && f.unge && nightF < .5 ? foelg(f) : null;
    if (mp) { tx = mp[0]; f.tz = clamp(f.mor.z + .03, .4, 1); f.pause = 0; }
    let want = 0;
    if (f.pause > 0 && !fl) f.pause -= dt;
    else want = clamp((tx - f.x) / (S * .3), -1, 1) * f.a.fart * S * (fl ? 1.6 : 1) * (nightF > .5 ? .3 : 1) * f.spd;
    if (f.skraek > 0) want *= .1;
    f.vx += (want - f.vx) * Math.min(1, dt * 3); f.vy = 0;
    f.x += f.vx * dt;
    f.z += (f.tz - f.z) * dt * (fl ? 1.2 : .05);
    const ty = sandY(f.z) - f.h * .42;
    f.y += (ty - f.y) * Math.min(1, dt * 3);
    if (krabbe) {
      f.ph += dt * Math.abs(f.vx) / S * 16;
      f.bob += -Math.abs(Math.sin(f.ph)) * f.h * .08; f.mr += Math.sin(f.ph) * .05;
      if (f.skraek > 0) f.my *= .85; // dukker sig
    } else { f.ph += dt * .7; f.mr += Math.sin(f.ph) * .05 + f.vx / S * .4; }
  }

  // Små fisk, der rider på skildpaddens skjold
  function rid(f, dt) {
    const h = f.ride.host, [u, v] = anker(h), i = f.ride.i;
    const [sx, sy] = lokal(h, u + (i - 1) * .27, v + Math.abs(i - 1) * .06);
    f.ride.t += dt;
    const k = Math.min(1, dt * 6);
    f.x += (sx - f.x) * k; f.y += (sy - f.h * .32 - f.y) * k;
    f.vx = h.vx; f.vy = 0; f.dir = h.dir; f.laas = true; f.z = h.z + .01 + i * .002;
    const s = lerp(1, .66, Math.min(1, f.ride.t / .6)); f.mx *= s; f.my *= s;
    f.bob += h.bob + Math.sin(T * 6 + i) * 2;
  }

  /* ---------- Tricks ---------- */
  // d = varighed, flyt = dyret svømmer væk fra spotlyset, drej = drej med svømmeretningen ("fuld" eller "let")
  const TRICK = {
    kuglefisk: { d: 4.2, start() { LYD.pusOp(); }, upd(f, t, dt, q) {
      const s = t < .45 ? 1 + .7 * fjeder(t / .45) : t < 2.4 ? 1.7 + .04 * Math.sin(t * 16) : 1.7 - .7 * glat((t - 2.4) / 1.8);
      f.mx *= s; f.my *= s * (1 + (s - 1) * .14); f.spd = .15;
      if (t >= 2.4 && !q.ud) { q.ud = 1; LYD.pusUd(); }
      if (t > 2.4 && t < 4 && Math.random() < dt * 9) { const [x, y] = mund(f); nyBoble(x, y, rnd(.03, .06), f.z); }
    } },
    blaeksprutte: { d: 4.4, start(f) {
      LYD.pfft();
      for (let i = 0; i < (RM.matches ? 6 : 18); i++) parts.push({ t: "blaek", x: f.x + rnd(-.25, .25) * f.w, y: f.y + rnd(-.1, .35) * f.h,
        vx: rnd(-1, 1) * S * .5, vy: rnd(-.3, .6) * S * .45, liv: 0, max: rnd(2.2, 3.4), s: rnd(.45, .8) * S });
      f.vx = (f.x < W / 2 ? 1 : -1) * S * 2; f.vy = -S * .9; f.skraek = .8;
    }, upd(f, t, dt, q) {
      const n = t > .35 && t < 3.9 ? 1 + Math.floor((t - .35) / 1.18) % 3 : 0;
      if (n !== f.tint && n) LYD.glimt();
      if (n) f.tint = n;
      f.tintA += ((n ? 1 : 0) - f.tintA) * Math.min(1, dt * 5);
    } },
    delfin: { d: 2.9, flyt: 1, drej: "fuld", start(f, q) {
      const dir = f.x < W / 2 ? 1 : f.x > W / 2 ? -1 : (Math.random() < .5 ? 1 : -1), h = f.h;
      const plads = dir > 0 ? W * .92 - f.x : f.x - W * .08, span = clamp(Math.min(W * .5, S * 3.4), Math.min(plads, S * 1.6), plads);
      q.dir = dir; f.dir = dir; f.laas = true;
      q.p0 = [f.x, f.y]; q.p1 = [f.x + dir * span * .22, surfY + h * .6];
      q.pk = [f.x + dir * span * .5, Math.max(surfY - h * .95, h * .5)];
      q.p3 = [f.x + dir * span * .78, surfY + h * .6]; q.p4 = [f.x + dir * span, Math.min(surfY + S * 1.7, floorY - h)];
    }, upd(f, t, dt, q) {
      f.dir = q.dir; f.laas = true;
      let x, y;
      if (t < .7) { const u = (t / .7) ** 1.6; x = lerp(q.p0[0], q.p1[0], u); y = lerp(q.p0[1], q.p1[1], u); }
      else if (t < 1.9) {
        const u = (t - .7) / 1.2, c = [q.pk[0], 2 * q.pk[1] - (q.p1[1] + q.p3[1]) / 2];
        x = (1 - u) ** 2 * q.p1[0] + 2 * u * (1 - u) * c[0] + u * u * q.p3[0];
        y = (1 - u) ** 2 * q.p1[1] + 2 * u * (1 - u) * c[1] + u * u * q.p3[1];
      } else { const u = glat((t - 1.9) / 1); x = lerp(q.p3[0], q.p4[0], u); y = lerp(q.p3[1], q.p4[1], u); }
      f.x = x; f.y = y;
      if (!q.ud && t >= .78) { q.ud = 1; plask(q.p1[0] + q.dir * f.w * .2, false); }
      if (!q.ind && t >= 1.85) { q.ind = 1; plask(q.p3[0], true); }
      f.over = t > .6 && t < 2.1;
      return true;
    } },
    hval: { d: 5.4, flyt: 1, start(f, q) {
      // pust ud et sted, hvor der er fri luft over vandet (ikke under perleskallen)
      q.y0 = f.y; q.x0 = f.x; q.xt = portrait ? clamp(f.x, W * .3, W * .7) : (f.x < W / 2 ? W * .24 : W * .76);
    }, upd(f, t, dt, q) {
      const top = surfY + f.h * .3;
      f.laas = true; f.spd = 0;
      if (t < 1.6) f.y = lerp(q.y0, top, glat(t / 1.6));
      else if (t < 3.8) {
        f.y = top + Math.sin((t - 1.6) * 3) * 2;
        if (!q.lyd) { q.lyd = 1; LYD.pust(); krusning(f.x, 1.4); }
        const [bx, by] = lokal(f, ...anker(f)), n = RM.matches ? 1 : 4, kraft = Math.min(1, (t - 1.6) * 3) * (t > 3 ? (3.4 - t) / .4 : 1);
        if (t < 3.4) for (let i = 0; i < n; i++) if (Math.random() < dt * 40) {
          const v = rnd(.7, 1) * kraft, sp = rnd(-1, 1) * (.2 + .9 * (1 - v));
          parts.push({ t: "draabe", x: bx + rnd(-3, 3), y: Math.min(by, surfY - 3), vx: sp * S, vy: -S * (2.4 + .9 * v),
            g: S * 6, s: rnd(4, 8) * S / 150, liv: 0, max: 2.6 });
        }
        if (t < 3.3 && Math.random() < dt * 8) parts.push({ t: "taage", x: bx + rnd(-1, 1) * S * .2, y: Math.min(by, surfY) - S * rnd(.4, 1), vx: rnd(-.3, .3) * S, vy: -S * .3, liv: 0, max: 1.4, s: S * .35 });
        if (Math.random() < dt * 3) krusning(f.x + rnd(-1, 1) * f.w * .4, .4);
      } else f.y = lerp(top, q.y0, glat((t - 3.8) / 1.6));
      f.x = lerp(q.x0, q.xt, glat(t / 1.6)) + Math.sin(t * .7) * S * .1 - (t > 3.8 ? (q.xt - q.x0) * glat((t - 3.8) / 1.6) * .5 : 0);
      f.over = t > 1.3 && t < 4.2;
      // på telefon er der ingen fri luft: perleskallen trækker sig lidt væk, mens hvalen pruster
      root.classList.toggle("ak-pust", portrait && t > 1.4 && t < 4);
      return true;
    }, slut() { root.classList.remove("ak-pust"); } },
    lysfisk: { d: 4.6, start() { LYD.glimt(); }, upd(f, t, dt, q) {
      f.glow = t < .5 ? t / .5 : t > 3.8 ? (4.6 - t) / .8 : 1 + .15 * Math.sin(t * 9);
      f.spd = .3;
      if (Math.random() < dt * 6) { const [x, y] = lokal(f, ...anker(f)); gnist(x + rnd(-1, 1) * S * .3, y + rnd(-1, 1) * S * .3, S * .14); }
      if (!q.g && t > 1.6) { q.g = 1; LYD.glimt(); }
    } },
    havskildpadde: { d: 6.6, flyt: 1, drej: "let", start(f, q) {
      q.riders = fish.filter(o => o !== f && !o.trick && !o.ride && !o.scene && o.a.str <= 1.05 && (o.a.slags === "fisk" || o.a.slags === "soehest"))
        .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)).slice(0, 3);
      q.riders.forEach((o, i) => { o.ride = { host: f, i: q.riders.length === 1 ? 1 : i, t: 0 }; });
      q.y0 = clamp(f.y, surfY + f.h * 1.4, floorY - f.h * .2); q.y1 = f.y; LYD.tutu();
    }, upd(f, t, dt, q) {
      f.x += S * .45 * f.dir * dt;
      if ((f.x < f.w * .6 && f.dir < 0) || (f.x > W - f.w * .6 && f.dir > 0)) f.dir *= -1;
      f.y = lerp(q.y1, q.y0, glat(t / .8)) + Math.sin(t * 1.6) * S * .06;
      f.mr += Math.sin(t * 2.4) * .05;
      if (Math.random() < dt * 2) parts.push({ t: "node", x: f.x + rnd(-.3, .3) * f.w, y: f.y - f.h * .7, vx: 0, vy: -S * .4, liv: 0, max: 1.4, s: S * .22, c: "#fff", txt: "♪" });
      if (t > this.d - .6 && !q.slip) slip(q);
      return true;
    }, slut(f, q) { slip(q); } },
    krabbe: { d: 3.8, start(f, q) { q.x0 = f.x; q.y0 = f.y; }, upd(f, t, dt, q) {
      if (t < 1.1) {
        const k = (t % .37) / .37, n = Math.floor(t / .37);
        f.my *= 1 + .14 * bump(k, 0, .5); f.mx *= 1 + .08 * bump(k, 0, .5);
        if (q.n !== n) { q.n = n; LYD.klik(); }
      } else {
        const u = t - 1.1, n = Math.floor(u / .34);
        f.x = clamp(q.x0 + Math.sin(u * 4.2) * S * .5, f.w * .5, W - f.w * .5);
        f.bob += -Math.abs(Math.sin(u * 8.4)) * S * .13; f.mr += Math.sin(u * 8.4) * .13;
        if (q.m !== n) { q.m = n; LYD.bop(n); if (n % 2) LYD.klik();
          parts.push({ t: "node", x: f.x + rnd(-.4, .4) * f.w, y: f.y - f.h * .6, vx: rnd(-.2, .2) * S, vy: -S * .5, liv: 0, max: 1.2, s: S * .24, c: "#fff6c0", txt: n % 2 ? "♪" : "♫" }); }
      }
      f.y = q.y0;
      return true;
    } },
    soestjerne: { d: 6.2, flyt: 1, start(f, q) {
      q.x0 = f.x; q.y0 = f.y; q.z0 = f.z; q.gx = clamp(f.x, W * .25, W * .75); q.gy = surfY + (floorY - surfY) * .32; q.by = floorY + (H - floorY) * .35;
      q.st = clamp(S * 1.6 / (f.d / lerp(1, f.heroS, f.spot)), 1.3, 2.4); // så stor, som når den sidder helt op ad glasset
      LYD.hop();
    }, upd(f, t, dt, q) {
      const st = q.st;
      if (t < .8) {
        const u = glat(t / .8);
        f.x = lerp(q.x0, q.gx, u); f.y = lerp(q.y0, q.gy, u) - Math.sin(u * Math.PI) * S * .6; f.z = lerp(q.z0, 1.4, u);
        const s = lerp(1, st, fjeder(t / .8)); f.mx *= s; f.my *= s; f.mr += u * TAU;
      } else if (t < 5.2) {
        if (!q.p) { q.p = 1; LYD.sug(); parts.push({ t: "ring", x: f.x, y: f.y, liv: 0, max: .6, s: f.w * st * .7 }); }
        if (!q.s && t > 1.3) { q.s = 1; LYD.knirk(); }
        const u = (t - .8) / 4.4, s = st * (1 + .025 * Math.sin(t * 3));
        f.x = q.gx + Math.sin(u * 7) * S * .05; f.y = lerp(q.gy, q.by, glat(u)); f.z = 1.4;
        f.mx *= s; f.my *= s; f.mr += Math.sin(t * 1.5) * .08;
        // et lille genskin på glasset, hvor den sidder
        if (Math.random() < dt * 2) gnist(f.x + rnd(-.4, .4) * f.w * st, f.y + rnd(-.4, .4) * f.h * st, S * .12);
      } else {
        const u = glat((t - 5.2) / 1), s = lerp(st, 1, u);
        f.mx *= s; f.my *= s; f.z = lerp(1.4, q.z0, u); f.y = lerp(q.by, sandY(q.z0) - f.h * .42, u);
      }
      return true;
    }, slut(f, q) { f.z = q.z0 ?? f.z; } },
    vandmand: { d: 3.4, upd(f, t, dt, q) {
      const n = Math.floor(t / .8), k = (t % .8) / .8;
      f.pulsLaas = true;
      if (n !== q.n && n < 4) {
        q.n = n; f.vy = -S * (f.y < surfY + f.h * 1.5 ? .2 : .9); LYD.puls(n);
        for (let i = 0; i < 5; i++) gnist(f.x + rnd(-.5, .5) * f.w, f.y + rnd(-.3, .5) * f.h, S * .12, "rosa");
      }
      f.mx *= 1 - .14 * bump(k, 0, .35); f.my *= 1 + .1 * bump(k, 0, .35);
      f.glow = Math.min(1, t * 3) * (t > 2.8 ? (3.4 - t) / .6 : 1);
    }, slut(f) { f.pulsLaas = false; } },
    rokke: { d: 2.8, flyt: 1, drej: "fuld", start(f, q) {
      q.R = Math.min(S * .95, (floorY - surfY) * .26); q.dir = f.dir; q.x0 = f.x; q.y0 = f.y;
      q.cx = f.x; q.cy = clamp(f.y - q.R, surfY + q.R + f.h * .6, floorY - q.R); LYD.sus();
    }, upd(f, t, dt, q) {
      f.dir = q.dir; f.laas = true;
      const u = Math.min(1, t / 2.3), a = Math.PI / 2 - q.dir * TAU * glat(u);
      let x = q.cx + q.dir * glat(u) * S * .9 + Math.cos(a) * q.R, y = q.cy + Math.sin(a) * q.R;
      if (t > 2.3) x += q.dir * S * 1.4 * (t - 2.3);
      const k = glat(Math.min(1, t / .3));
      f.x = lerp(q.x0, x, k); f.y = lerp(q.y0, y, k);
      return true;
    } },
    haj: { d: 5, flyt: 1, drej: "let", start(f, q) { LYD.hehe(); }, upd(f, t, dt, q) {
      if (t < .8) {
        f.mx *= 1 + .14 * bump(t, 0, .8); f.my *= 1 + .14 * bump(t, 0, .8); f.spd = .1;
        if (!q.g) { q.g = 1; const [x, y] = mund(f); for (let i = 0; i < 4; i++) gnist(x + rnd(-.2, .2) * f.w, y + rnd(-.1, .1) * f.h, S * .2); }
        return false;
      }
      if (!q.lap) {
        q.lap = 1; LYD.hurtig(); q.bx = f.x; q.by = f.y;
        q.cx = W / 2; q.cy = (surfY + floorY) / 2; q.rx = W * .36; q.ry = (floorY - surfY) * .3;
        q.a0 = Math.atan2((f.y - q.cy) / q.ry, (f.x - q.cx) / q.rx);
        q.s = -Math.sin(q.a0) * f.dir >= 0 ? 1 : -1;
      }
      if (t < 4.4) {
        const u = (t - .8) / 3.6, a = q.a0 + q.s * TAU * glat(u), k = glat(Math.min(1, (t - .8) / .6));
        f.x = lerp(q.bx, q.cx + Math.cos(a) * q.rx, k); f.y = lerp(q.by, q.cy + Math.sin(a) * q.ry, k);
        if (Math.random() < dt * 14) { const [x, y] = lokal(f, .95, .5); nyBoble(x, y, rnd(.03, .06), f.z); }
        return true;
      }
      f.skraek = .4;
      return false;
    } },
    soehest: { d: 3.2, start() { LYD.vip(); }, upd(f, t, dt, q) {
      if (t < 1.6) { let s = Math.cos(t / 1.6 * 2 * TAU); if (Math.abs(s) < .12) s = s < 0 ? -.12 : .12; f.mx *= s; }
      f.bob += Math.sin(t * 5) * S * .16 * bump(t, 0, 3.2);
      f.mr += Math.sin(t * 9) * .14 * bump(t, 1.4, 3.2); f.spd = .2;
      const n = Math.floor(t / .45);
      if (q.n !== n) { q.n = n; parts.push({ t: "node", x: f.x + rnd(-.4, .4) * f.w, y: f.y - f.h * .4, vx: rnd(-.2, .2) * S, vy: -S * .45, liv: 0, max: 1.3, s: S * .22, c: "#ff8fc6", txt: "♥" }); }
    } },
    klovnfisk: { d: 6.6, flyt: 1, drej: "let", start(f, q) {
      q.x0 = f.x; q.y0 = f.y; q.z0 = f.z; q.cx = koral.x; q.cy = koral.by - koral.h * .45; q.cz = koral.z - .03;
    }, upd(f, t, dt, q) {
      if (t < 1.8) {
        const u = glat(t / 1.8);
        f.x = lerp(q.x0, q.cx, u); f.y = lerp(q.y0, q.cy, u) - Math.sin(u * Math.PI) * S * .3; f.z = lerp(q.z0, q.cz, Math.min(1, u * 1.5));
      } else if (t < 2.6) { f.x = q.cx; f.y = q.cy + Math.sin(t * 3) * 2; f.z = q.cz; f.vx = 0; }
      else if (t < 4.4) {
        const h = t < 3.5, b = h ? bump(t, 2.6, 3.4) : bump(t, 3.6, 4.4), side = h ? 1 : -1;
        f.x = q.cx + side * koral.w * .42 * b; f.y = q.cy; f.z = q.cz;
        f.laas = true; f.dir = side; f.dirS = side;
        const k = h ? "a" : "b";
        if (b > .9 && !q[k]) { q[k] = 1; LYD.tit(); }
      } else if (t < 5.2) {
        const u = glat((t - 4.4) / .8);
        f.x = q.cx; f.y = lerp(q.cy, q.cy - koral.h * .8, u); f.z = u > .5 ? koral.z + .05 : q.cz;
        if (!q.ud) { q.ud = 1; LYD.tittut(); for (let i = 0; i < 6; i++) gnist(q.cx + rnd(-.5, .5) * koral.w, q.cy - koral.h * .4 + rnd(-.3, .3) * koral.h, S * .18); }
      } else { f.z = lerp(f.z, q.z0, Math.min(1, dt * 2)); return false; }
      return true;
    }, slut(f, q) { if (q.z0 != null) f.tz = q.z0; } },
    guldfisk: { d: 2.6, start(f, q) { LYD.blub(); q.b = { x: f.x, y: f.y, r: 2, ph: rnd(0, TAU), vy: 0, fri: false, z: f.z }; bigs.push(q.b); }, upd(f, t, dt, q) {
      const b = q.b;
      if (t < 1.5 && !b.fri) {
        const [mx, my] = mund(f);
        b.r = Math.max(2, S * .34 * glat(t / 1.5)); b.x = mx + f.dir * b.r * .92; b.y = my; f.spd = .04;
        f.mx *= 1 + .05 * Math.sin(t * 18); f.my *= 1 + .05 * Math.sin(t * 18);
      } else if (!b.fri) { b.fri = true; b.vy = -S * .2; f.vx = -f.dir * S * .8; f.skraek = .5; }
    }, slut(f, q) { if (q.b) q.b.fri = true; } },
    kirurgfisk: { d: 2.6, flyt: 1, drej: "let", start(f, q) { q.y0 = clamp(f.y, surfY + f.h * 1.2 + S * .45, floorY - f.h * .4 - S * .45); q.x = f.x; q.dir = f.dir; q.yb = f.y; }, upd(f, t, dt, q) {
      if (t > 2.4) return false;
      q.x += q.dir * S * 2.6 * dt;
      if ((q.x < f.w * .6 && q.dir < 0) || (q.x > W - f.w * .6 && q.dir > 0)) q.dir *= -1;
      const tri = u => 2 * Math.abs(2 * (u - Math.floor(u + .5))) - 1, k = glat(Math.min(1, t / .3));
      f.x = q.x; f.y = lerp(q.yb, q.y0 + tri(t * 1.9) * S * .45, k);
      const n = Math.floor(t * 3.8 + .5);
      if (n !== q.n) { q.n = n; LYD.zig(n); }
      if (Math.random() < dt * 12) { const [x, y] = lokal(f, .95, .5); nyBoble(x, y, rnd(.025, .05), f.z); }
      return true;
    } },
  };

  function slip(q) {
    if (q.slip) return; q.slip = 1;
    (q.riders || []).forEach(o => { if (o.ride) { o.ride = null; o.laas = false; o.vy = -S * 1.1; o.vx = rnd(-1, 1) * S * .6; o.skraek = .6; } });
  }

  function startTrick(f, medNavn) {
    if (f.trick || f.ride) return false;
    f.trick = { def: TRICK[f.k], t: 0, q: {}, vent: medNavn ? .8 : 0, startet: false };
    if (medNavn) naarStille(() => Spil.say(stor(f.a.best) + "!", null, "akva-navn-" + f.k));
    return true;
  }
  function slutTrick(f) {
    const tr = f.trick; if (!tr) return;
    if (tr.startet && tr.def.slut) tr.def.slut(f, tr.q);
    f.trick = null; f.laas = false; f.over = false; f.glow = 0; f.drej = null;
  }

  /* ---------- Bobler, mad, partikler ---------- */
  function nyBoble(x, y, r, z) {
    if (bubbles.length > 140) return;
    bubbles.push({ x, y, r: r * S, vy: -S * rnd(.45, .7) - r * S * 3, ph: rnd(0, TAU), z: z ?? .5 });
  }
  function gnist(x, y, s, farve) { parts.push({ t: "gnist", x, y, vx: rnd(-.3, .3) * S, vy: rnd(-.5, .1) * S, liv: 0, max: rnd(.6, 1.1), s, rot: rnd(0, TAU), c: farve }); }
  function gnistRing(x, y, n, r, s) {
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rnd(-.2, .2);
      parts.push({ t: "gnist", x, y, vx: Math.cos(a) * r, vy: Math.sin(a) * r, liv: 0, max: rnd(.7, 1.2), s: s * rnd(.7, 1.2), rot: rnd(0, TAU), dr: 1 });
    }
  }
  function krusning(x, amp) { ripples.push({ x, t: 0, amp: amp * S * .05 }); if (ripples.length > 14) ripples.shift(); }
  function plask(x, stort) {
    LYD.plask(stort); krusning(x, stort ? 2.2 : 1.5);
    const n = RM.matches ? 6 : stort ? 26 : 16;
    for (let i = 0; i < n; i++) parts.push({ t: "draabe", x: x + rnd(-1, 1) * S * .3, y: surfY, vx: rnd(-1, 1) * S * 1.1, vy: -S * rnd(1.2, 2.6), g: S * 7, s: rnd(2.5, 5.5) * S / 150, liv: 0, max: 2 });
    for (let i = 0; i < 8; i++) nyBoble(x + rnd(-1, 1) * S * .4, surfY + rnd(10, S * .5), rnd(.03, .07), .8);
  }

  function dryss(x, mange) {
    if (fish.length && fish.every(f => maet(f) || f.scene || f.ude) && alleSoverT < 0 && !Spil.isTalking()) {
      alleSoverT = T; Spil.say("Alle fiskene er mætte. Tryk på dem, så laver de tricks!", null, "akva-alle-maette");
    }
    const n = mange ? 4 : 2;
    for (let i = 0; i < n && flakes.length < 70; i++) {
      // Ca. hver syvende er en tung, brun pille, der synker hurtigt til bunden. Svømmerne lader dem være,
      // så krabben og søstjernen også kan få mad (det er lidt sværere, men aldrig umuligt).
      const pille = Math.random() < .14;
      flakes.push({ x: clamp(x + rnd(-1, 1) * S * .28, 10, W - 10), y: surfY + rnd(2, 12), vy: S * (pille ? rnd(.5, .62) : rnd(.17, .25)),
        ph: rnd(0, TAU), z: rnd(.3, .95), rot: rnd(0, TAU), c: pille ? "#8a5a2b" : FLAGE_FARVER[Math.random() * FLAGE_FARVER.length | 0],
        pille, liv: 0, bund: false, dead: false });
    }
    krusning(x, mange ? .7 : .35); LYD.drys();
    if (!haandVist) { haandVist = true; const h = q(".ak-haand"); if (h) h.hidden = true; }
  }

  function spis(f, fl) {
    fl.dead = true; f.eatT = .32; LYD.nam();
    const [mx, my] = mund(f); nyBoble(mx, my - 4, .03, f.z); nyBoble(mx + 6, my - 10, .02, f.z);
    if (f.ride || f.scene) return;
    if (f.unge) { // ungen bliver mæt som de andre, men forbliver lille
      f.spist = (f.spist || 0) + 1;
      if (f.spist >= MAET) { f.spist = 0; f.lurTil = Date.now() + LUR * 1000 * rnd(.85, 1.15); }
      return;
    }
    f.mad++; gem.mad[f.k] = f.mad;
    f.spist = (f.spist || 0) + 1;
    if (f.spist >= MAET) {
      f.spist = 0; f.lurTil = Date.now() + LUR * 1000 * rnd(.85, 1.15); (gem.lur = gem.lur || {})[f.k] = f.lurTil;
      if (!maetSagt && !demo) { maetSagt = true; later(() => naarStille(() => { if (!scene) Spil.say("Fisken er mæt! Nu vil den hellere lege.", null, "akva-maet"); }), 900); }
      if (f.grown && kanFaaUnge(f.k)) {
        const l = gem.lyst || (gem.lyst = {});
        l[f.k] = (l[f.k] || 0) + 1;
        if (l[f.k] >= AEG) { l[f.k] = 0; later(() => laegAeg(f), 2500); }
      }
    }
    if (!f.grown && f.mad >= VOKS) vokser(f);
    else {
      gemNu();
      if (!f.grown && !vokseHint && f.mad >= 2) { vokseHint = true; later(() => { if (!Spil.isTalking() && !scene) Spil.say("Når fiskene spiser, bliver de store!", null, "akva-vokser"); }, 700); }
    }
  }

  function vokser(f) {
    f.grown = true; f.growT = 0; gemNu();
    LYD.plop(); gnistRing(f.x, f.y, RM.matches ? 8 : 18, S * 1.4, S * .22);
    parts.push({ t: "ring", x: f.x, y: f.y, liv: 0, max: .7, s: f.w * 1.6 });
    later(() => naarStille(() => { if (!scene) Spil.say(stor(f.a.best) + " er blevet stor!", null, "akva-stor-" + f.k); }), 300);
  }

  /* ---------- Æg og unger ---------- */
  const kanFaaUnge = k => !gem.unger.includes(k) && !gem.aeg.includes(k);
  const foraelder = k => fish.find(o => o.k === k && !o.unge);
  // Et æg på sandet (eller en boble midt i vandet for delfinen og hvalen) i nærheden af foraelderen
  function nytAeg(k, f, ny) {
    const boble = LEVENDE.has(k), z = f ? clamp(f.z, .35, .9) : rnd(.4, .85);
    let x = f ? f.x + rnd(-.4, .4) * S : rnd(W * .2, W * .8);
    if (kiste && Math.abs(x - kiste.x) < kiste.w * .7) x = kiste.x + (x < kiste.x ? -1 : 1) * kiste.w * .8;
    const e = { k, boble, x: clamp(x, S * .6, W - S * .6), z, y: 0, ny: ny ? 0 : 1, wig: 0, ur: rnd(1.5, 3), ph: rnd(0, TAU), klaek: -1, aeg: true,
      fy: f ? f.y : lerp(surfY, floorY, .45) };
    aegs.push(e); placerAeg(e);
    return e;
  }
  function placerAeg(e) {
    e.x = clamp(e.x, S * .6, W - S * .6);
    if (e.boble) { e.r = S * .5; e.y = clamp(e.fy, surfY + S * 1.1, floorY - S * .9) + Math.sin(e.ph) * S * .08; }
    else { e.r = S * .2 * (.7 + .3 * e.z); e.y = sandY(e.z) - e.r; }
  }
  function laegAeg(f) {
    if (!alive || !fish.includes(f) || !kanFaaUnge(f.k)) return;
    gem.aeg.push(f.k); gemNu();
    const e = nytAeg(f.k, f, true);
    LYD.plop(); gnistRing(e.x, e.y, RM.matches ? 5 : 10, S * .8, S * .16);
    naarStille(() => { if (!scene && !bogOpen) Spil.say(e.boble ? "Se, en lille boble! Tryk på den!" : "Se, et æg! Tryk på det!", null, e.boble ? "akva-boble-unge" : "akva-aeg"); });
  }
  function klaek(e) {
    if (e.klaek >= 0) return;
    e.klaek = 0; LYD.klik(); Spil.stopTalking();
  }
  // når ægget er revnet færdigt, kommer ungen ud
  function klaekket(e) {
    aegs.splice(aegs.indexOf(e), 1);
    gem.aeg = gem.aeg.filter(k => k !== e.k);
    const mor = foraelder(e.k);
    if (!mor || gem.unger.includes(e.k)) { gemNu(); return; }
    gem.unger.push(e.k); gemNu();
    const u = nyFisk(e.k, e.x, e.boble ? e.y : e.y - S * .25, mor);
    u.ind = 0; u.z = u.tz = e.z; dims(u); u.vy = e.boble ? 0 : -S * .6;
    fish.push(u);
    LYD.guldPop(); LYD.plop(); Spil.sfx.right();
    gnistRing(e.x, e.y, RM.matches ? 8 : 16, S * 1.2, S * .2);
    parts.push({ t: "ring", x: e.x, y: e.y, liv: 0, max: .6, s: e.r * 3 });
    for (let i = 0; i < 8; i++) nyBoble(e.x + rnd(-1, 1) * e.r, e.y + rnd(-1, .5) * e.r, rnd(.02, .05), e.z);
    hoert.add(e.k);
    Spil.say(stor(mor.a.best) + " har fået en unge!", null, "akva-unge-" + e.k);
  }
  function opdaterAeg(dt) {
    for (const e of aegs.slice()) {
      e.ph += dt * 1.3;
      if (e.ny < 1) e.ny = Math.min(1, e.ny + dt / .5);
      if (e.klaek >= 0) { e.klaek += dt / (RM.matches ? .25 : .55); if (e.klaek >= 1) { klaekket(e); continue; } }
      else if ((e.ur -= dt) <= 0) { e.ur = rnd(2.2, 4); e.wig = 1; }
      e.wig = Math.max(0, e.wig - dt * 1.5);
      placerAeg(e);
    }
  }
  function tegnAeg(e) {
    const k = e.klaek >= 0 ? e.klaek : 0, s = fjeder(e.ny) * (1 + .22 * k);
    const vip = RM.matches ? 0 : Math.sin(T * 22) * (.2 * e.wig + .3 * k);
    cx.save();
    if (e.boble) {
      // ungen ses inde i boblen
      cx.translate(e.x, e.y); cx.rotate(vip * .3); cx.scale(s, s);
      const img = billede(e.k + "-unge"), r = e.r;
      if (klar(img)) {
        const ar = img.naturalHeight / img.naturalWidth, w = r * 1.35, h = w * ar;
        cx.globalAlpha = .95; cx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      cx.globalAlpha = 1 - k * .6; cx.drawImage(SPR.boble, -r, -r, r * 2, r * 2);
      cx.globalAlpha = .35; cx.strokeStyle = "#fff"; cx.lineWidth = Math.max(2, r * .05);
      cx.beginPath(); cx.arc(0, 0, r * .96, 0, TAU); cx.stroke();
    } else {
      const r = e.r;
      cx.globalAlpha = .22; cx.fillStyle = "#06243f";
      cx.beginPath(); cx.ellipse(e.x, e.y + r * .95, r * .9 * s, r * .22 * s, 0, 0, TAU); cx.fill();
      cx.globalAlpha = 1;
      cx.translate(e.x, e.y + r); cx.rotate(vip); cx.scale(s, s); // vipper om bunden af ægget
      const g = cx.createRadialGradient(-r * .3, -r * 1.35, r * .1, 0, -r, r * 1.1);
      g.addColorStop(0, "#fffef6"); g.addColorStop(.7, "#fbe9c8"); g.addColorStop(1, "#e2c596");
      cx.fillStyle = g; cx.strokeStyle = "rgba(120,80,30,.45)"; cx.lineWidth = Math.max(1.5, r * .07);
      cx.beginPath(); cx.ellipse(0, -r, r * .78, r, 0, 0, TAU); cx.fill(); cx.stroke();
      cx.fillStyle = "rgba(255,143,184,.55)";
      for (const [px, py, pr] of [[-.3, -1.3, .14], [.28, -.75, .11], [-.1, -.5, .08], [.22, -1.45, .09]]) { cx.beginPath(); cx.arc(px * r, py * r, pr * r, 0, TAU); cx.fill(); }
      cx.fillStyle = "rgba(255,255,255,.7)"; cx.beginPath(); cx.ellipse(-r * .3, -r * 1.45, r * .14, r * .22, -.4, 0, TAU); cx.fill();
      if (k > .25) { // revnen
        cx.strokeStyle = "rgba(90,55,20,.8)"; cx.lineWidth = Math.max(1.5, r * .08); cx.beginPath();
        const n = 5, b = r * .78 * Math.min(1, (k - .25) * 2);
        cx.moveTo(-b, -r * 1.05);
        for (let i = 1; i <= n; i++) cx.lineTo(-b + 2 * b * i / n, -r * (1.05 + (i % 2 ? -.12 : .1)));
        cx.stroke();
      }
    }
    cx.restore();
  }

  function nyGuld(x, y) {
    golds.push({ x: x ?? kiste.x, y: y ?? kiste.by - kiste.h * .62, r: S * .3, ph: rnd(0, TAU), vy: -S * .28, x0: x ?? kiste.x, t: 0 });
    kiste.wig = .7; LYD.guldKom(); sidstGuld = T;
    for (let i = 0; i < 4; i++) nyBoble(kiste.x + rnd(-.3, .3) * kiste.w, kiste.by - kiste.h * .6, rnd(.02, .05), kiste.z);
    if (perleHint < 1 && hintN < 3 && gem.fundet.length < BEGYNDER && !Spil.isTalking() && !scene) { perleHint++; hintN++; later(() => { if (!Spil.isTalking() && !scene) Spil.say("Pop de gyldne bobler!", null, "akva-bobler"); }, 900); }
  }

  function popGuld(b) {
    golds.splice(golds.indexOf(b), 1);
    LYD.guldPop(); gnistRing(b.x, b.y, RM.matches ? 6 : 12, S * 1.1, S * .2);
    for (let i = 0; i < 6; i++) nyBoble(b.x + rnd(-1, 1) * b.r, b.y + rnd(-1, 1) * b.r, rnd(.02, .05), .9);
    perleHint = 9;
    if (gem.perler + paaVej >= PERLER) return;
    const nr = gem.perler + paaVej; paaVej++;
    const slot = root.querySelectorAll(".ak-perle")[nr], el = document.createElement("div");
    el.className = "ak-flyv"; root.appendChild(el);
    const rr = root.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    const tx = sr.left + sr.width / 2 - rr.left, ty = sr.top + sr.height / 2 - rr.top;
    const mx = (b.x + tx) / 2 + rnd(-1, 1) * S * .5, my = Math.min(b.y, ty) - S * .3;
    const anim = el.animate([
      { transform: `translate(${b.x}px,${b.y}px) scale(1.3)` },
      { transform: `translate(${mx}px,${my}px) scale(1.5)`, offset: .45 },
      { transform: `translate(${tx}px,${ty}px) scale(1)` }], { duration: RM.matches ? 300 : 750, easing: "cubic-bezier(.4,0,.3,1)", fill: "forwards" });
    anim.onfinish = () => {
      el.remove(); if (!alive) return;
      paaVej--; gem.perler++; gemNu(); tegnPerler(gem.perler - 1);
      LYD.ding(gem.perler);
      const nyt = ARTER.some(a => !gem.fundet.includes(a.k));
      if (gem.perler >= PERLER) { Spil.say(nyt ? "Fem perler! Skattekisten åbner sig!" : "Fem perler!", null, nyt ? ["tal-5", "akva-kiste"] : "tal-5"); later(aabnKiste, 700); }
      else if (gem.perler === 1 && !gem.perleSagt) { gem.perleSagt = 1; gemNu(); Spil.say("Én! En perle! Saml fem perler, så åbner skattekisten!", null, ["tal-1", "akva-perle"]); }
      else Spil.say(String(gem.perler), null, "tal-" + gem.perler);
    };
    nextGold = T + rnd(5, 9);
  }

  function tegnPerler(hop) {
    root.querySelectorAll(".ak-perle").forEach((p, i) => {
      p.classList.toggle("fuld", i < gem.perler);
      if (i === hop) { p.classList.remove("hop"); void p.offsetWidth; p.classList.add("hop"); }
    });
  }

  /* ---------- Skattekisten og det nye dyr ---------- */
  // hvor dyret står i spotlyset: midt i vandet, men krabben og søstjernen helt fremme på sandet
  function heltPunkt(f) {
    const y = surfY + (floorY - surfY) * (portrait ? .5 : .52);
    if (f && (f.a.slags === "krabbe" || f.a.slags === "stjerne")) return [W / 2, Math.max(y, H - f.h * .62)];
    return [W / 2, y];
  }
  function heltStr(f) {
    const base = S * f.a.str * (f.grown ? 1 : .68);
    return Math.max(1, Math.min(H * .42, W * (portrait ? .5 : .46)) / base);
  }

  function aabnKiste() {
    if (scene) return;
    lukBog();
    const a = ARTER.find(x => !gem.fundet.includes(x.k));
    scene = { kind: "kiste", t: 0, a, f: null, fase: 0 };
    // perlerne flyver ned i kisten
    const rr = root.getBoundingClientRect();
    root.querySelectorAll(".ak-perle").forEach((p, i) => {
      const r = p.getBoundingClientRect(), el = document.createElement("div"); el.className = "ak-flyv"; root.appendChild(el);
      const x0 = r.left + r.width / 2 - rr.left, y0 = r.top + r.height / 2 - rr.top;
      const an = el.animate([{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${kiste.x + (i - 2) * kiste.w * .08}px,${kiste.by - kiste.h * .55}px) scale(.5)`, opacity: .9 }],
        { duration: 800, delay: i * 70, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" });
      an.onfinish = () => el.remove();
    });
    gem.perler = 0; gemNu(); tegnPerler();
    later(() => LYD.rumle(), 1000);
  }

  function visFisk(f) {
    if (scene) return;
    slutTrick(f); if (f.ride) f.ride = null;
    if (f.ude) { // kom tilbage til spotlyset, også selv om den var svømmet væk
      if (f.x < 0 || f.x > W) f.x = f.x < 0 ? -f.w * .5 : W + f.w * .5;
      f.ude = null;
    }
    scene = { kind: "vis", t: 0, f, fase: 1, t0: 0, x0: f.x, y0: f.y, z0: f.z };
    f.scene = true; f.heroS = heltStr(f); f.spotT = 1; f.laas = false;
    Spil.say(stor(f.a.best) + "!", null, "akva-navn-" + f.k); hoert.add(f.k);
    visNavn(f.a.navn);
  }

  function visNavn(txt) {
    const n = q(".ak-navn"); n.textContent = txt;
    n.classList.remove("vis"); void n.offsetWidth; if (txt) n.classList.add("vis");
  }

  function opdaterScene(dt) {
    const s = scene; s.t += dt; const t = s.t;
    if (s.kind === "kiste" && s.fase === 0) {
      dimT = t < .4 ? .1 : .38;
      kiste.front = true;
      kiste.shake = RM.matches ? 0 : clamp((t - .8) / 1.8, 0, 1) ** 1.5;
      kiste.glow = clamp((t - .3) / 2.1, 0, 1);
      if (Math.random() < dt * 10 * kiste.glow) nyBoble(kiste.x + rnd(-.35, .35) * kiste.w, kiste.by - kiste.h * .58, rnd(.02, .04), kiste.z);
      if (Math.random() < dt * 9 * kiste.glow) gnist(kiste.x + rnd(-.45, .45) * kiste.w, kiste.by - kiste.h * rnd(.5, .7), S * rnd(.1, .18));
      if (t >= 2.6) {
        s.fase = 1; s.t0 = t; kiste.openT = 1; kiste.shake = 0; LYD.brag();
        for (let i = 0; i < (RM.matches ? 12 : 50); i++) nyBoble(kiste.x + rnd(-.4, .4) * kiste.w, kiste.by - kiste.h * rnd(.4, .7), rnd(.02, .08), 1.2);
        gnistRing(kiste.x, kiste.by - kiste.h * .6, RM.matches ? 8 : 22, S * 2, S * .26);
        if (s.a) {
          const f = nyFisk(s.a.k, kiste.x, kiste.by - kiste.h * .55);
          f.z = .6; f.scene = true; f.heroS = heltStr(f); f.spot = 0; f.spotT = 1; f.dir = f.x < W / 2 ? 1 : -1; f.dirS = f.dir;
          fish.push(f); s.f = f; s.x0 = f.x; s.y0 = f.y; s.z0 = f.z;
          gem.fundet.push(s.a.k); gem.ny = (gem.ny || []).concat(s.a.k); gemNu(); hoert.add(s.a.k);
          q(".ak-bogknap").classList.add("ny");
        } else {
          Spil.burst(kiste.x, kiste.by - kiste.h * .6, "🐠🐟⭐🐡✨🐚🌟🐙");
          fish.forEach(o => { if (!o.trick && !o.a.front) { o.vy = -S * 1.4; o.skraek = .6; } });
          Spil.say("Wow!", null, "ros-4");
          s.fase = 3; s.t3 = t + 1.6;
        }
      }
      return;
    }
    const f = s.f;
    if (s.fase === 1) {
      // dyret svømmer frem til glasset, tæt på os
      dimT = .55;
      const u = clamp((t - s.t0) / 1.7, 0, 1), e = glat(u), [hx, hy] = heltPunkt(f);
      f.x = lerp(s.x0, hx, e); f.y = lerp(s.y0, hy, e) - (s.kind === "kiste" ? Math.sin(u * Math.PI) * S * .5 : 0);
      f.z = lerp(s.z0, 1, e); f.vx = (hx - s.x0) * .3; f.vy = 0;
      if (!f.a.front && Math.abs(hx - s.x0) > 4) { f.dir = hx > s.x0 ? 1 : -1; }
      if (s.kind === "kiste" && !s.sagt && t - s.t0 > .5) {
        s.sagt = 1; visNavn(f.a.navn);
        Spil.say((f.a.fisk ? "En ny fisk! Det er " : "Et nyt havdyr! Det er ") + f.a.best + "!", null, "akva-ny-" + f.k);
        LYD.glimt();
      }
      if (Math.random() < dt * 5) gnist(f.x + rnd(-.6, .6) * f.w, f.y + rnd(-.5, .5) * f.h, S * .16);
      if (t - s.t0 > (s.kind === "kiste" ? 3.6 : 1.9)) {
        // under tricket bliver dyret lidt mindre, så der er plads (og svømmer det væk, næsten helt normalt)
        s.fase = 2; startTrick(f, false); f.spotT = .62; visNavn("");
        if (f.trick && f.trick.def.flyt) { f.spotT = .22; f.spot = Math.min(f.spot, .55); dimT = .2; }
      }
    } else if (s.fase === 2) {
      if (!f.trick) {
        s.fase = 3; s.t3 = t; f.scene = false; f.spotT = 0; visNavn("");
        kiste.openT = 0; kiste.glow = 0; nytMaal(f); f.tz = rnd(.5, .9);
      }
    } else if (s.fase === 3) {
      dimT = 0; kiste.openT = 0; kiste.glow = Math.max(0, kiste.glow - dt);
      if (t - s.t3 > 1.4) {
        kiste.front = false;
        const alle = ARTER.every(a => gem.fundet.includes(a.k));
        if (s.kind === "kiste" && s.a && alle) {
          Spil.burst(W / 2, H / 2, "🐠🐟⭐🐡✨🐚🌟🐙"); Spil.sfx.fanfare();
          later(() => Spil.say("Du har fundet alle havdyrene! Hurra!", null, "akva-alle"), 300);
        }
        scene = null;
      }
    }
  }

  /* ---------- Bogen ---------- */
  function aabnBog() {
    if (scene) return;
    bogOpen = true; LYD.side();
    const ny = gem.ny || [];
    q(".ak-gitter").innerHTML = ARTER.map(a => {
      const fundet = gem.fundet.includes(a.k), m = Math.min(VOKS, gem.mad[a.k] || 0), voksen = m >= VOKS;
      if (!fundet) return `<button class="ak-kort sil" data-k="${a.k}" aria-label="Ikke fundet endnu"><img src="${STI}${a.k}-unge.webp" alt=""><span class="ak-sp">?</span></button>`;
      return `<button class="ak-kort${ny.includes(a.k) ? " ny" : ""}" data-k="${a.k}" aria-label="${a.navn}">
        <img src="${STI}${a.k}-${voksen ? "voksen" : "unge"}.webp" alt="">${voksen ? `<span class="ak-stjerne">⭐</span>` : ""}${gem.unger.includes(a.k) ? `<span class="ak-ungemaerke">🍼</span>` : ""}
        <span class="ak-kort-navn">${a.navn}</span>
        ${voksen ? "" : `<span class="ak-prikker">${Array.from({ length: VOKS }, (_, i) => `<i${i < m ? ' class="fuld"' : ""}></i>`).join("")}</span>`}</button>`;
    }).join("");
    root.querySelectorAll(".ak-kort").forEach(b => b.onclick = e => {
      e.stopPropagation();
      const k = b.dataset.k;
      if (!gem.fundet.includes(k)) {
        b.classList.remove("ak-vipper"); void b.offsetWidth; b.classList.add("ak-vipper"); Spil.sfx.wrong();
        Spil.say("Den har du ikke fundet endnu. Pop de gyldne bobler!", null, ["akva-mangler", "akva-bobler"]);
        return;
      }
      Spil.sfx.click();
      visFakta(k);
    });
    q(".ak-fakta").hidden = true; q(".ak-side").hidden = false;
    q(".ak-bog").hidden = false;
    gem.ny = []; gemNu(); q(".ak-bogknap").classList.remove("ny");
    Spil.say("Her er din akvariebog.", null, "akva-bog");
  }
  function lukBog() { bogOpen = false; const b = q(".ak-bog"); if (b) b.hidden = true; const fk = q(".ak-fakta"); if (fk) fk.hidden = true; }

  // Fakta-siden: stort billede, navn, én fakta ad gangen (læses højt). 🔊 eller tryk på billedet = næste fakta,
  // 👀 = luk bogen og se dyret i akvariet, ⬅️ = tilbage til bogen. Er dyret blevet stort, skifter 🐣 mellem
  // "da den var lille" og sådan som den ser ud nu.
  function visFakta(k) {
    const a = ART[k], liste = FAKTA[k] || [];
    const voksen = Math.min(VOKS, gem.mad[k] || 0) >= VOKS;
    const d = q(".ak-fakta");
    d.innerHTML = `<button class="ak-fk-billede" aria-label="Fortæl mere om ${a.best}"><img src="${STI}${k}-${voksen ? "voksen" : "unge"}.webp" alt=""></button>
      <div class="ak-fk-tekst"><span class="ak-fk-navn">${a.navn}</span><p class="ak-fk-fakta"></p>
        <div class="ak-fk-prikker">${liste.map(() => "<i></i>").join("")}</div>
      <div class="ak-fk-knapper">
        <button class="ak-fk-tilbage" aria-label="Tilbage til bogen">⬅️</button>
        <button class="ak-fk-mere" aria-label="Fortæl mere">🔊</button>
        ${voksen ? `<button class="ak-fk-lille" aria-label="Da den var lille" aria-pressed="false">🐣</button>` : ""}
        <button class="ak-fk-se" aria-label="Se ${a.best} i akvariet">👀</button></div></div>`;
    d.hidden = false; q(".ak-side").hidden = true;
    d.onclick = e => e.stopPropagation();
    const naeste = () => {
      if (!liste.length) return;
      const i = faktaNr[k] = ((faktaNr[k] ?? -1) + 1) % liste.length;
      d.querySelector(".ak-fk-fakta").textContent = liste[i];
      d.querySelectorAll(".ak-fk-prikker i").forEach((p, j) => p.classList.toggle("fuld", j === i));
      const b = d.querySelector(".ak-fk-billede"); b.classList.remove("ak-vipper"); void b.offsetWidth; b.classList.add("ak-vipper");
      Spil.say(liste[i], null, "fakta-" + k + "-" + i);
    };
    d.querySelector(".ak-fk-billede").onclick = () => { Spil.sfx.click(); naeste(); };
    d.querySelector(".ak-fk-mere").onclick = () => { Spil.sfx.click(); naeste(); };
    const lk = d.querySelector(".ak-fk-lille");
    if (lk) lk.onclick = () => {
      const lille = lk.getAttribute("aria-pressed") !== "true";
      lk.setAttribute("aria-pressed", String(lille)); lk.textContent = lille ? "⭐" : "🐣";
      lk.setAttribute("aria-label", lille ? "Sådan ser den ud nu" : "Da den var lille");
      const b = d.querySelector(".ak-fk-billede");
      b.querySelector("img").src = `${STI}${k}-${lille ? "unge" : "voksen"}.webp`;
      b.classList.toggle("lille", lille);
      b.classList.remove("ak-vipper"); void b.offsetWidth; b.classList.add("ak-vipper");
      LYD.plop();
      Spil.say(lille ? "Sådan så den ud, da den var lille." : "Og sådan ser den ud nu!", null, lille ? "akva-lille" : "akva-nu-stor");
    };
    d.querySelector(".ak-fk-tilbage").onclick = () => { Spil.sfx.click(); Spil.stopTalking(); d.hidden = true; q(".ak-side").hidden = false; };
    d.querySelector(".ak-fk-se").onclick = () => {
      Spil.stopTalking(); lukBog(); Spil.sfx.click();
      const f = foraelder(k); if (f) visFisk(f);
    };
    naeste();
  }

  /* ---------- Dag og nat ---------- */
  function skiftNat(nat) {
    night = nat;
    const k = q(".ak-natknap"); k.textContent = nat ? "☀️" : "🌙"; k.classList.toggle("nat", nat); k.setAttribute("aria-label", nat ? "Dag" : "Nat");
    fish.forEach(f => { f.sovY = 0; });
    if (nat) { LYD.nat(); Spil.say("Godnat, fisk. Nu sover de.", null, "akva-nat"); }
    else { LYD.dag(); Spil.say("Godmorgen, fisk!", null, "akva-dag"); }
  }

  /* ---------- Tryk ---------- */
  function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  function ramtFisk(x, y) {
    let best = null, bs = 1e9;
    for (const f of fish) {
      if (f.ride || f.scene || f.ude) continue;
      const w = Math.max(f.w * Math.abs(f.mx) * .5, 38), h = Math.max(f.h * f.my * .5, 38);
      const dx = (x - f.x) / w, dy = (y - f.y - f.bob) / h, d = dx * dx + dy * dy;
      if (d > 1.15) continue;
      const sc = d - f.z * .6;
      if (sc < bs) { bs = sc; best = f; }
    }
    return best;
  }
  function ramtPynt(x, y) {
    for (let i = decos.length - 1; i >= 0; i--) {
      const d = decos[i];
      if (d.z > 1) continue;
      const pad = d.kiste ? 20 : 0;
      if (x > d.x - d.w / 2 - pad && x < d.x + d.w / 2 + pad && y > d.by - d.h - pad && y < d.by + pad) return d;
    }
    return null;
  }

  function trykFisk(f) {
    if (f.trick) { f.eatT = .3; LYD.blop(); return; }
    const forste = !hoert.has(f.k); hoert.add(f.k);
    startTrick(f, forste);
  }

  function trykPynt(d) {
    d.wig = 1;
    if (d.kiste) {
      LYD.svup();
      for (let i = 0; i < 6; i++) nyBoble(d.x + rnd(-.3, .3) * d.w, d.by - d.h * .58, rnd(.02, .05), d.z);
      if (!golds.length && T - sidstGuld > 3 && gem.perler + paaVej < PERLER) nyGuld();
      else if (kisteHint < 2 && !Spil.isTalking()) { kisteHint++; Spil.say("Saml fem perler, så åbner skattekisten!", null, "akva-kiste-hint"); }
    } else if (d.musling) {
      LYD.glimt();
      for (let i = 0; i < 5; i++) gnist(d.x + rnd(-.15, .15) * d.w, d.by - d.h * .45 + rnd(-.1, .1) * d.h, S * .18);
    } else {
      LYD.svup();
      const n = d.sten ? 12 : 5;
      for (let i = 0; i < n; i++) nyBoble(d.x + rnd(-.3, .3) * d.w, d.by - d.h * rnd(.3, .9), rnd(.02, .06), d.z);
    }
  }

  function skraem(x, y) {
    let nogen = false;
    for (const f of fish) {
      if (f.trick || f.ride || f.scene) continue;
      const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1, R = S * 2.3;
      if (d > R) continue;
      nogen = true;
      const k = (1 - d / R) * (nightF > .5 ? .4 : 1);
      if (f.a.front && f.a.slags !== "vandmand" && f.a.slags !== "blaek") { f.skraek = .5 * k + .2; continue; }
      f.vx = dx / d * S * (1.5 + 2.2 * k); f.vy = dy / d * S * (1 + 1.4 * k); f.skraek = .5 + .8 * k; f.hvil = 0;
      if (!f.a.front && Math.abs(f.vx) > S * .1) f.dir = Math.sign(f.vx);
    }
    parts.push({ t: "ring", x, y, liv: 0, max: .55, s: S * .9 });
    for (let i = 0; i < 4; i++) nyBoble(x + rnd(-1, 1) * 10, y + rnd(-1, 1) * 10, rnd(.02, .045), .9);
    if (nogen) LYD.skraek(); else LYD.blop();
  }

  function ned(e) {
    e.preventDefault();
    const [x, y] = pos(e); sidstRort = T;
    if (scene || bogOpen) return;
    for (const b of bigs) if (b.r > S * .12 && Math.hypot(x - b.x, y - b.y) < b.r + 26) { popStor(b); return; }
    for (const b of golds) if (Math.hypot(x - b.x, y - b.y) < b.r * 1.15 + 24) { popGuld(b); return; }
    let ae = null, ad = 1e9; // det nærmeste æg, der ikke allerede er ved at klække
    for (const e of aegs) { const d = Math.hypot(x - e.x, y - e.y) - e.r; if (e.klaek < 0 && d < e.r * .2 + 30 && d < ad) { ad = d; ae = e; } }
    if (ae) { klaek(ae); return; }
    if (y < madZone()) { dryss(x, true); pointer = { mode: "mad", x, y, lx: x, lt: T }; return; }
    const f = ramtFisk(x, y); if (f) { trykFisk(f); return; }
    const sf = ramtSil(x, y); if (sf) { kald(sf); return; }
    const d = ramtPynt(x, y); if (d) { trykPynt(d); return; }
    pointer = { mode: "vand", x, y, x0: x, y0: y, t0: T, ring: T };
  }
  function flyt(e) {
    if (!pointer) return;
    const [x, y] = pos(e); pointer.x = x; pointer.y = y;
    if (pointer.mode === "mad" && (Math.abs(x - pointer.lx) > S * .3 || T - pointer.lt > .18)) { dryss(x, false); pointer.lx = x; pointer.lt = T; }
  }
  function op() {
    const p = pointer; pointer = null;
    if (p && p.mode === "vand" && T - p.t0 < .28 && Math.hypot(p.x - p.x0, p.y - p.y0) < 24) skraem(p.x, p.y);
  }
  function popStor(b) {
    b.dead = true; LYD.guldPop(); Spil.sfx.right();
    gnistRing(b.x, b.y, RM.matches ? 6 : 14, S * 1.2, S * .2);
    parts.push({ t: "ring", x: b.x, y: b.y, liv: 0, max: .5, s: b.r * 2.4 });
    for (let i = 0; i < 10; i++) nyBoble(b.x + rnd(-1, 1) * b.r, b.y + rnd(-1, 1) * b.r, rnd(.02, .05), b.z);
  }

  /* ---------- Hovedløkken ---------- */
  function step(now) {
    raf = requestAnimationFrame(step);
    const t0 = performance.now();
    const dtr = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
    const dt = (RM.matches ? dtr * .8 : dtr) * tidsFaktor;
    T += dtr * tidsFaktor;
    opdater(dt);
    tegn();
    // mål billedtiden; går det for langsomt, sænkes opløsningen lidt
    const st = frameStat;
    st.n++; st.js += performance.now() - t0; st.dt += dtr * 1000;
    if (st.n >= 120) {
      st.sidstJs = st.js / st.n; st.sidstDt = st.dt / st.n;
      if (st.sidstDt > 26 && kval > 1 && !st.test) { kval = Math.max(1, kval - .5); maal(); }
      st.n = 0; st.js = 0; st.dt = 0;
    }
  }

  function opdater(dt) {
    nightF += ((night ? 1 : 0) - nightF) * Math.min(1, dt * .6);
    if (scene) opdaterScene(dt);
    else dimT = 0;
    dimF += (dimT - dimF) * Math.min(1, dt * 2.5);
    let lokalT = 0;
    for (const f of fish) if (f.trick && f.k === "lysfisk" && f.trick.startet) lokalT = Math.max(lokalT, f.glow * .75);
    dimLocal += (lokalT * (1 - nightF) - dimLocal) * Math.min(1, dt * 3);

    for (const f of fish) opdaterFisk(f, dt);
    opdaterAeg(dt);

    // mad
    for (const fl of flakes) {
      if (fl.dead) continue;
      if (!fl.bund) {
        fl.y += fl.vy * dt; fl.ph += dt * 2; fl.x += Math.sin(fl.ph) * S * .2 * dt; fl.rot += dt * 1.5;
        if (fl.y >= sandY(fl.z) - 3) fl.bund = true;
      } else { fl.liv += dt; if (fl.liv > 14) fl.dead = true; }
      for (const f of fish) {
        if (f.scene || (f.trick && f.trick.def.flyt && f.trick.startet) || f.eatT > .15 || maet(f)) continue;
        const bundDyr = f.a.slags === "krabbe" || f.a.slags === "stjerne";
        if (fl.pille && !bundDyr) continue;
        if (bundDyr && fl.bund && Math.abs(fl.x - f.x) < f.w * .45 && Math.abs(fl.z - f.z) < .12) { spis(f, fl); break; }
        const [mx, my] = mund(f), r = S * .2 * (.6 + .4 * clamp(f.z, 0, 1));
        if (Math.abs(fl.x - mx) < r && Math.abs(fl.y - my) < r) { spis(f, fl); break; }
      }
    }
    flakes = flakes.filter(f => !f.dead);

    // bobler
    bobleUr -= dt;
    if (bobleUr <= 0) {
      bobleUr = rnd(.25, .6);
      const st = decos.find(d => d.sten);
      if (st) nyBoble(st.x + st.w * rnd(.05, .15), st.by - st.h * .85, rnd(.015, .04), st.z);
      if (Math.random() < .25) nyBoble(kiste.x + rnd(-.3, .3) * kiste.w, kiste.by - kiste.h * .58, rnd(.015, .035), kiste.z);
      if (Math.random() < .3) { const f = fish[Math.random() * fish.length | 0]; if (f && !f.a.front) { const [x, y] = mund(f); nyBoble(x, y, rnd(.015, .03), f.z); } }
      if (nightF > .8 && Math.random() < .35) {
        const f = fish[Math.random() * fish.length | 0];
        if (f && !f.a.lys && !f.trick) parts.push({ t: "node", x: f.x + f.w * .2, y: f.y - f.h * .5, vx: S * .1, vy: -S * .25, liv: 0, max: 2.2, s: S * .2, c: "rgba(220,235,255,.9)", txt: "z" });
      }
    }
    for (const b of bubbles) {
      b.ph += dt * 3; b.y += b.vy * dt; b.x += Math.sin(b.ph) * S * .12 * dt;
      if (b.y < surfY + b.r) { b.dead = true; if (b.r > S * .035) krusning(b.x, .15); }
    }
    bubbles = bubbles.filter(b => !b.dead);

    // gyldne bobler
    if (!scene && !bogOpen && T > nextGold && !golds.length && gem.perler + paaVej < PERLER) { nyGuld(); nextGold = T + rnd(9, 14); }
    for (const b of golds) {
      b.t += dt; b.ph += dt * 1.6; b.y += b.vy * dt * (scene ? .2 : 1); b.x = b.x0 + Math.sin(b.ph) * S * .28;
      if (b.y < surfY + b.r * .9) { b.dead = true; krusning(b.x, .6); LYD.blop(); nextGold = Math.min(nextGold, T + 3); }
    }
    golds = golds.filter(b => !b.dead);
    for (const b of bigs) {
      if (!b.fri) continue;
      b.ph += dt * 1.4; b.y += b.vy * dt; b.x += Math.sin(b.ph) * S * .15 * dt;
      if (b.y < surfY + b.r) { popStor(b); krusning(b.x, .8); }
    }
    bigs = bigs.filter(b => !b.dead);

    // partikler
    for (const p of parts) {
      p.liv += dt;
      if (p.liv >= p.max) { p.dead = true; continue; }
      if (p.vx) p.x += p.vx * dt;
      if (p.vy) p.y += p.vy * dt;
      if (p.t === "gnist") { p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; p.rot += dt * 2; }
      else if (p.t === "blaek") { p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; }
      else if (p.t === "taage") { p.vx *= 1 - dt; p.vy *= 1 - dt * 1.5; }
      else if (p.t === "draabe") {
        p.vy += p.g * dt;
        // falder dråben tilbage i vandet, bliver den til en lille ring
        if (p.vy > 0 && p.y > surfY + 3) { p.dead = true; if (Math.random() < .3) krusning(p.x, .2); }
      }
    }
    parts = parts.filter(p => !p.dead);
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    for (const r of ripples) r.t += dt;
    ripples = ripples.filter(r => r.t < 2.6);
    for (const d of decos) {
      d.wig = Math.max(0, d.wig - dt * 1.1);
      d.open += (d.openT - d.open) * Math.min(1, dt * 5);
    }
    if (!scene) kiste.glow = gem.perler + paaVej >= PERLER - 1 ? .35 + .15 * Math.sin(T * 3) : Math.max(0, kiste.glow - dt);

    if (!scene && !bogOpen) styrUde(dt);
    // af og til laver et dyr sit trick helt af sig selv, så akvariet lever
    if (!scene && !bogOpen && T > nextSelv) {
      nextSelv = T + rnd(25, 40);
      const kan = fish.filter(f => !f.trick && !f.ride && !f.ude && f.k !== "lysfisk" && (nightF < .5 || f.a.lys));
      if (kan.length) startTrick(kan[Math.random() * kan.length | 0], false);
    }
    // stille hjælp, hvis ingen har rørt skærmen et stykke tid
    if (!scene && !bogOpen && T - sidstRort > hjaelpUr && !Spil.isTalking() && hintN < 3 && gem.fundet.length < BEGYNDER) {
      sidstRort = T; hintN++; hjaelpUr *= 2; // 24 s, 48 s, 96 s, og så ikke mere
      if (golds.length) Spil.say("Pop de gyldne bobler!", null, "akva-bobler");
      else if (hintN % 2) Spil.say("Giv fiskene mad! Tryk her oppe ved vandet.", null, "akva-mad");
      else Spil.say("Tryk på en fisk!", null, "akva-tryk-fisk");
    }
    if (pointer && pointer.mode === "vand" && T - pointer.t0 > .3 && T - pointer.ring > .5) {
      pointer.ring = T; parts.push({ t: "ring", x: pointer.x, y: pointer.y, liv: 0, max: .8, s: S * .6, blid: 1 });
    }
  }

  // Hold styr på, hvor mange dyr der er på skærmen: send et ud, hent et ind igen, og byt af og til,
  // så alle dyr kommer forbi
  // en unge tæller som en halv: den er lille og svømmer lige bag sin forælder
  const antalSynlige = () => fish.reduce((n, f) => n + (f.ude || BLIVER.has(f.a.slags) ? 0 : f.unge ? .5 : 1), 0);
  // Ved start: er der for mange dyr, venter nogle af dem uden for billedet og kommer ind senere
  function startUde() {
    const maks = portrait ? SYNLIGE.smal : SYNLIGE.bred;
    const kan = Spil.shuffle(fish.filter(f => !f.unge && !BLIVER.has(f.a.slags)));
    while (antalSynlige() > maks && kan.length) {
      const f = kan.pop(), side = Math.random() < .5 ? -1 : 1;
      f.x = side < 0 ? -f.w * 1.1 : W + f.w * 1.1;
      f.ude = { side, y: clamp(f.y, surfY + f.h, floorY - f.h * .5), ret: false, vaek: T - rnd(0, 20) };
      for (const u of fish) if (u.mor === f) { u.x = f.x; u.ude = { side, y: f.ude.y, ret: false, vaek: f.ude.vaek, folger: 1 }; }
    }
  }
  function sendUd(f) {
    const side = f.x < W / 2 ? -1 : 1, y = clamp(f.y, surfY + f.h, floorY - f.h * .5);
    f.ude = { side, y, ret: false, vaek: 0 };
    for (const u of fish) if (u.mor === f) u.ude = { side, y, ret: false, vaek: 0, folger: 1 };
  }
  // side: hvilken side den svømmer ind fra (-1 venstre, 1 højre); ellers tilfældig
  function hentInd(f, side) {
    side = side || (Math.random() < .5 ? -1 : 1);
    f.z = f.tz = nyDybde(); dims(f);
    f.x = side < 0 ? -f.w * .9 : W + f.w * .9; f.ude.ret = true; f.ude.sil = null;
    f.ude.mx = rnd(W * .25, W * .75); f.ude.y = rnd(surfY + f.h, floorY - f.h);
    for (const u of fish) if (u.mor === f && u.ude) { u.ude = null; u.x = f.x - side * f.w * .6; u.y = f.ude.y; } // kun unger, der er væk med den
  }

  /* ---------- Silhuetter: dyr, der er svømmet væk, ses langt ude i det blå ---------- */
  const SIL = {};
  function silhuet(n) {
    if (SIL[n]) return SIL[n];
    const i = billede(n); if (!klar(i)) return null;
    const c = document.createElement("canvas"), w = 160, h = Math.max(1, Math.round(w * i.naturalHeight / i.naturalWidth));
    c.width = w; c.height = h;
    const g = c.getContext("2d"); g.drawImage(i, 0, 0, w, h);
    g.globalCompositeOperation = "source-in"; g.fillStyle = "#0b3d66"; g.fillRect(0, 0, w, h);
    return (SIL[n] = c);
  }
  const silStr = f => S * f.a.str * .3 * (f.grown ? 1 : .75);
  // silhuetten glider langsomt frem og tilbage; den starter ved den kant, hvor dyret svømmede ud
  function svoemSil(f, dt) {
    let s = f.ude.sil;
    if (!s) {
      const side = f.ude.side || 1;
      s = f.ude.sil = { x: side < 0 ? S * .4 : W - S * .4, y: lerp(surfY, floorY, rnd(.15, .6)), dir: -side, dirS: -side, ph: rnd(0, TAU), a: 0 };
    }
    s.a = Math.min(1, s.a + dt / 1.5); s.ph += dt * .8;
    s.x += s.dir * S * (.08 + .1 * f.a.fart) * dt;
    if ((s.x < S * .4 && s.dir < 0) || (s.x > W - S * .4 && s.dir > 0)) s.dir = -s.dir;
    s.dirS += clamp(s.dir - s.dirS, -dt * 1.5, dt * 1.5);
    s.x = clamp(s.x, 0, W); s.y = clamp(s.y, surfY + S * .4, floorY - S * .2);
  }
  function tegnSil(n, x, y, d, dirS, a) {
    const c = silhuet(n); if (!c) return;
    const ar = c.height / c.width, w = ar > 1 ? d / ar : d, h = ar > 1 ? d : d * ar;
    let sx = -dirS; if (Math.abs(sx) < .18) sx = sx < 0 ? -.18 : .18;
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.scale(sx, 1); cx.drawImage(c, -w / 2, -h / 2, w, h); cx.restore();
  }
  function tegnSilhuetter() {
    const a0 = .3 * (1 - nightF * .5);
    for (const f of fish) {
      const s = !f.unge && vaek(f) && f.ude.sil; if (!s) continue;
      const d = silStr(f), y = s.y + Math.sin(s.ph) * S * .05;
      tegnSil(f.k + (f.grown ? "-voksen" : "-unge"), s.x, y, d, s.dirS, a0 * s.a);
      // ungen svømmer lige bag sin forælder, også derude
      for (const u of fish) if (u.mor === f && (u.x < -u.w * .6 || u.x > W + u.w * .6))
        tegnSil(u.k + "-unge", s.x - s.dirS * d * .75, y + d * .12, d * .5, s.dirS, a0 * s.a);
    }
  }
  function ramtSil(x, y) {
    for (const f of fish) {
      const s = !f.unge && vaek(f) && f.ude.sil; if (!s || s.a < .5) continue;
      if (Math.hypot(x - s.x, y - s.y) < silStr(f) * .6 + 30) return f;
    }
    return null;
  }
  // tryk på en silhuet: dyret kommer svømmende ind fra den nærmeste side
  function kald(f) {
    const s = f.ude.sil;
    LYD.blop(); parts.push({ t: "ring", x: s.x, y: s.y, liv: 0, max: .6, s: S * .7, blid: 1 });
    hentInd(f, s.x < W / 2 ? -1 : 1);
    udeUr = Math.max(udeUr, 4);
  }

  function styrUde(dt) {
    if ((udeUr -= dt) > 0) return;
    const maks = portrait ? SYNLIGE.smal : SYNLIGE.bred;
    const synlige = antalSynlige();
    udeUr = synlige > maks + 1.5 ? rnd(2, 3.5) : rnd(6, 11);
    const borte = fish.filter(f => vaek(f) && T - f.ude.vaek > 12).sort((a, b) => a.ude.vaek - b.ude.vaek);
    const kanGaa = fish.filter(f => !f.ude && !f.unge && !f.trick && !f.ride && !f.scene && f.spot < .05 && !BLIVER.has(f.a.slags));
    const send = sendUd, hent = f => hentInd(f);
    if (synlige > maks && kanGaa.length) send(kanGaa[Math.random() * kanGaa.length | 0]);
    else if (synlige < maks && borte.length) hent(borte[0]);
    else if (borte.length && T - borte[0].ude.vaek > 30) { hent(borte[0]); if (kanGaa.length) send(kanGaa[Math.random() * kanGaa.length | 0]); } // byt, så alle kommer forbi
    // ungerne følger bare forælderen; deres eget ude-mærke fjernes, når forælderen er tilbage
    for (const u of fish) if (u.ude && u.ude.folger && !(u.mor && u.mor.ude)) u.ude = null;
  }

  function opdaterFisk(f, dt) {
    if (vaek(f)) { f.vx = f.vy = 0; if (!f.unge) svoemSil(f, dt); return; } // ungen tegnes bag forælderens silhuet
    if (f.unge && f.mor && vaek(f.mor) && (f.x < -f.w * .6 || f.x > W + f.w * .6)) { f.vx = f.vy = 0; return; }
    f.mx = 1; f.my = 1; f.mr = 0; f.bob = 0; f.spd = 1; f.over = false;
    f.glow = 0; f.laas = !!f.ride;
    if (f.k !== "blaeksprutte" || !f.trick) { f.tintA = Math.max(0, f.tintA - dt * 3); }
    if (f.growT >= 0) { f.growT += dt / .9; if (f.growT >= 1) f.growT = -1; }
    if (f.ind < 1) { f.ind = Math.min(1, f.ind + dt / .6); const s = Math.max(.05, fjeder(f.ind)); f.mx *= s; f.my *= s; } // en ny unge popper frem
    f.spot += (f.spotT - f.spot) * Math.min(1, dt * 2.4);
    if (f.skraek > 0) f.skraek -= dt;
    f.bp += dt * 1.4;
    const px = f.x, py = f.y;
    let styret = false;
    const tr = f.trick;
    if (tr) {
      if (tr.vent > 0) { tr.vent -= dt; f.my *= 1 + .08 * Math.sin(tr.vent * 20); f.spd = .3; }
      else {
        if (!tr.startet) { tr.startet = true; tr.def.start && tr.def.start(f, tr.q); }
        tr.t += dt;
        styret = !!tr.def.upd(f, tr.t, dt, tr.q);
        if (tr.t >= tr.def.d) slutTrick(f);
      }
    }
    const sl = f.a.slags;
    if (f.ride) rid(f, dt);
    else if (styret) { f.vx = (f.x - px) / dt; f.vy = (f.y - py) / dt; }
    else if (f.scene) {
      // i spotlyset: bliv foran glasset
      if (scene && scene.fase === 2) { const [hx, hy] = heltPunkt(f); f.x += (hx - f.x) * Math.min(1, dt * 2); f.y += (hy - f.y) * Math.min(1, dt * 2); }
      f.bob += Math.sin(f.bp) * S * .03;
    }
    else if (sl === "krabbe" || sl === "stjerne") bund(f, dt);
    else if (sl === "vandmand") vandmand(f, dt);
    else svoem(f, dt);

    if (!styret && !f.ride && !f.scene && sl !== "krabbe" && sl !== "stjerne") {
      f.x += f.vx * dt; f.y += f.vy * dt;
      // bliv i vandet
      const fri = f.ude || (f.unge && f.mor && f.mor.ude);
      const minX = fri ? -1e9 : f.w * .3, maxX = fri ? 1e9 : W - f.w * .3, minY = surfY + f.h * .5 + 6, maxY = Math.max(minY, sandY(f.z) - f.h * .35);
      if (f.x < minX) f.vx += (minX - f.x) * 4 * dt; if (f.x > maxX) f.vx -= (f.x - maxX) * 4 * dt;
      if (f.y < minY) { f.vy += (minY - f.y) * 5 * dt; f.y = Math.max(f.y, surfY + 4); }
      if (f.y > maxY) f.vy -= (f.y - maxY) * 5 * dt;
      f.x = fri ? clamp(f.x, -W * .6 - f.w, W * 1.6 + f.w) : clamp(f.x, -W * .1, W * 1.1); f.y = Math.min(f.y, H);
      f.zUr -= dt; f.z += (f.tz - f.z) * Math.min(1, dt * .12);
    }
    // vend og hæld i svømmeretningen
    const fart = Math.hypot(f.vx, f.vy);
    if (!f.a.front) {
      if (!f.laas) { if (f.vx > S * .1) f.dir = 1; else if (f.vx < -S * .1) f.dir = -1; }
      f.dirS += clamp(f.dir - f.dirS, -dt * 4.5, dt * 4.5);
      let rt = 0;
      const drej = f.trick && f.trick.startet && f.trick.def.drej;
      if (drej === "fuld" && fart > S * .3) { const h = Math.atan2(f.vy, f.vx); rt = vinkel(f.dir > 0 ? h : h - Math.PI); f.rot += vinkel(rt - f.rot) * Math.min(1, dt * 12); }
      else {
        if (sl !== "soehest" && !f.scene) rt = clamp(f.dir * Math.atan2(f.vy, Math.abs(f.vx) + S * .25) * (drej ? 1 : .7), -.5, .5);
        f.rot += vinkel(rt - f.rot) * Math.min(1, dt * 3);
      }
    } else { f.dir = -1; f.dirS = -1; f.rot += (0 - f.rot) * Math.min(1, dt * 3); }
    // svømmetag
    f.ph += dt * (1.4 + fart / S * 5);
    if (sl !== "vandmand" && sl !== "krabbe" && sl !== "stjerne" && sl !== "blaek") { f.slagX = 1 + .022 * Math.sin(f.ph); f.slagY = 1 - .018 * Math.sin(f.ph); }
    else { f.slagX = f.slagY = 1; }
    if (f.eatT > 0) { const k = bump(f.eatT, 0, .32); f.mx *= 1 + .12 * k; f.my *= 1 + .1 * k; f.eatT -= dt; }
    if (f.growT >= 0) { const k = Math.sin(f.growT * Math.PI) * .22; f.mx *= 1 + k; f.my *= 1 + k; }
    dims(f);
  }

  /* ---------- Tegning ---------- */
  const STRAALER = Array.from({ length: 7 }, (_, i) => ({ u: (i + .5) / 7 + rnd(-.04, .04), b: rnd(.045, .1), f: rnd(0, TAU), s: rnd(.15, .35) }));
  const TANG = Array.from({ length: 11 }, (_, i) => ({ u: (i + rnd(.1, .9)) / 11, h: rnd(.25, .6), w: rnd(.09, .16), f: rnd(0, TAU), z: rnd(0, .15) }));

  function straaler(g, alpha, farve) {
    if (alpha < .005) return;
    const len = (floorY - surfY) + (H - floorY) * .5, tilt = .28, tid = RM.matches ? 0 : T;
    g.globalCompositeOperation = "lighter";
    for (const r of STRAALER) {
      const x0 = r.u * W * 1.15 - W * .12 + Math.sin(tid * r.s * .6 + r.f) * W * .03;
      const w0 = r.b * W * (.7 + .3 * Math.sin(tid * r.s + r.f * 2)), w1 = w0 * 2.3, x1 = x0 + len * tilt;
      const a = alpha * (.55 + .45 * Math.sin(tid * r.s * 1.3 + r.f));
      const gr = g.createLinearGradient(0, surfY, 0, surfY + len);
      gr.addColorStop(0, `rgba(${farve},${a})`); gr.addColorStop(.6, `rgba(${farve},${a * .4})`); gr.addColorStop(1, `rgba(${farve},0)`);
      g.fillStyle = gr; g.beginPath();
      g.moveTo(x0 - w0 / 2, surfY); g.lineTo(x0 + w0 / 2, surfY); g.lineTo(x1 + w1 / 2, surfY + len); g.lineTo(x1 - w1 / 2, surfY + len); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  // Fjern tang i baggrunden: bløde, bølgende bånd, der bliver smallere mod toppen og svajer mest foroven
  function fjernTang() {
    const tid = RM.matches ? 0 : T, n = 12;
    for (const s of TANG) {
      const x = s.u * W, y = sandY(s.z) - (H - floorY) * .12, h = s.h * (floorY - surfY), bw = s.w * S;
      const L = [], R = [];
      for (let i = 0; i <= n; i++) {
        const v = i / n, sw = (Math.sin(tid * .8 + s.f - v * 2.2) * S * .32 + Math.sin(tid * 1.7 + s.f * 2 - v * 5) * S * .05) * v * v;
        const px = x + sw, py = y - v * h, w = bw * (1 - v * .8) * (1 + .25 * Math.sin(v * 9 + s.f));
        L.push([px - w / 2, py]); R.push([px + w / 2, py]);
      }
      cx.fillStyle = s.f > 3 ? "rgba(22,104,124,.42)" : "rgba(30,118,120,.38)";
      cx.beginPath(); cx.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i <= n; i++) cx.lineTo(L[i][0], L[i][1]);
      for (let i = n; i >= 0; i--) cx.lineTo(R[i][0], R[i][1]);
      cx.closePath(); cx.fill();
    }
  }

  function kaustikker(g) {
    const tid = RM.matches ? 0 : T, a0 = (1 - nightF * .85) * (1 - dimLocal * .7);
    if (a0 < .02) return;
    g.save(); g.beginPath(); sandSti(g); g.clip();
    g.globalCompositeOperation = "lighter";
    const ts = S * 2.3, th = ts * .45;
    const lag = [[SPR.kaustik[0], tid * S * .11, tid * S * .045, .55], [SPR.kaustik[1], -tid * S * .08, tid * S * .03, .45]];
    for (const [img, ox, oy, a] of lag) {
      g.globalAlpha = a * a0;
      const sx = ((ox % ts) + ts) % ts, sy = ((oy % th) + th) % th;
      for (let y = floorY - H * .03 - sy; y < H; y += th) for (let x = -sx; x < W; x += ts) g.drawImage(img, x, y, ts + 1, th + 1);
    }
    g.restore();
  }

  function skygger() {
    for (const f of fish) {
      if (f.over || f.scene) continue;
      const sy = sandY(f.z), hoej = sy - (f.y + f.h * .4);
      const a = .26 * clamp(1 - hoej / (H * .45), 0, 1);
      if (a < .02) continue;
      const w = f.w * Math.abs(f.mx) * (.9 - .3 * clamp(hoej / (H * .45), 0, 1));
      cx.globalAlpha = a; cx.drawImage(SPR.skygge, f.x - w / 2, sy - w * .1, w, w * .2);
    }
    cx.globalAlpha = 1;
  }

  function tegnFisk(f) {
    const navn = f.k + (f.grown ? "-voksen" : "-unge"), img = billede(navn);
    if (!klar(img)) return;
    cx.save();
    cx.translate(f.x, f.y + f.bob); cx.rotate(f.rot + f.mr);
    let sx = -f.dirS; if (Math.abs(sx) < .18) sx = sx < 0 ? -.18 : .18;
    cx.scale(sx * f.mx * f.slagX, f.my * f.slagY);
    if (f.growT >= 0) {
      // ungen bliver til den voksne: tværton mellem de to billeder
      const u = billede(f.k + "-unge"), p = clamp(f.growT * 1.6, 0, 1);
      if (klar(u)) { const ar = u.naturalHeight / u.naturalWidth, uw = ar > 1 ? f.d / ar : f.d, uh = ar > 1 ? f.d : f.d * ar; cx.globalAlpha = 1 - p; cx.drawImage(u, -uw / 2, -uh / 2, uw, uh); }
      cx.globalAlpha = p;
    }
    cx.drawImage(img, -f.w / 2, -f.h / 2, f.w, f.h);
    if (f.tintA > .02 && f.tint) {
      const c = farvet(navn, BLAEK_FARVER[f.tint - 1]);
      if (c) { cx.globalAlpha = f.tintA; cx.drawImage(c, -f.w / 2, -f.h / 2, f.w, f.h); }
    }
    const fjern = f.scene ? 0 : clamp((.32 - f.z) / .3, 0, 1);
    if (fjern > .03) { const c = farvet(navn, "#4aa6dc"); if (c) { cx.globalAlpha = fjern * .4; cx.drawImage(c, -f.w / 2, -f.h / 2, f.w, f.h); } }
    cx.restore();
    if (f.glow > .02 && f.a.lys) {
      // lampen eller klokken lyser
      const [x, y] = f.k === "lysfisk" ? lokal(f, ...anker(f)) : [f.x, f.y + f.bob - f.h * .12];
      const r = (f.k === "lysfisk" ? S * .75 : f.w * .95) * (.8 + .2 * Math.sin(T * 7)) * Math.min(1.2, f.glow);
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = Math.min(1, f.glow) * (f.k === "lysfisk" ? 1 : .6);
      cx.drawImage(SPR[f.k === "lysfisk" ? "gul" : "rosa"], x - r, y - r, r * 2, r * 2);
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
  }

  function tegnPynt(d) {
    const img = d.img; if (!klar(img)) return;
    if (d.kiste) return tegnKiste(d);
    const tid = RM.matches ? 0 : T;
    const sw = d.sv * Math.sin(tid * .9 + d.f) + d.wig * .14 * Math.sin(tid * 9) * (d.sv ? 1 : .3);
    cx.save(); cx.translate(d.x, d.by);
    if (d.sv && !RM.matches) {
      // tang svajer mest i toppen: tegn i skiver som led i en kæde, hvor hvert led drejer lidt mere
      const iw = img.naturalWidth, ih = img.naturalHeight, n = 4, hh = d.h / n;
      for (let i = 0; i < n; i++) {
        const v0 = 1 - (i + 1) / n;
        cx.rotate(sw * (i + 1) / n * .7);
        cx.drawImage(img, 0, ih * v0, iw, ih / n + 2, -d.w / 2, -hh - 1, d.w, hh + 3);
        cx.translate(0, -hh);
      }
    } else {
      cx.rotate(sw); cx.drawImage(img, -d.w / 2, -d.h, d.w, d.h);
    }
    cx.restore();
  }

  function tegnKiste(c) {
    const img = c.img, iw = img.naturalWidth, ih = img.naturalHeight, sp = .42;
    cx.save(); cx.translate(c.x, c.by);
    if (c.shake > 0) { const s = c.shake; cx.translate(Math.sin(T * 53) * 4 * s, 0); cx.rotate(Math.sin(T * 41) * .06 * s); }
    else if (c.wig > 0 && !RM.matches) cx.rotate(Math.sin(T * 14) * .05 * c.wig);
    if (c.glow > .01) {
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = c.glow * .9;
      const g = c.w * (2.2 + .2 * Math.sin(T * 5)); cx.drawImage(SPR.gul, -g / 2, -c.h * .55 - g / 2, g, g);
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
    const bh = c.h * (1 - sp), o = c.open;
    if (o > .01) {
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = o * .9;
      const g = c.w * 1.5; cx.drawImage(SPR.gul, -g / 2, -bh - g * .62, g, g);
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
    cx.drawImage(img, 0, ih * sp, iw, ih * (1 - sp), -c.w / 2, -bh, c.w, bh);
    if (o > .01) {
      // indeni: mørkt rum med en bunke guld, der lyser
      cx.fillStyle = "#3a1d08"; cx.beginPath(); cx.ellipse(0, -bh, c.w * .42, c.h * .11 * o, 0, 0, TAU); cx.fill();
      cx.fillStyle = "#ffcf3f"; cx.beginPath(); cx.ellipse(0, -bh - c.h * .02 * o, c.w * .34, c.h * .07 * o, 0, 0, TAU); cx.fill();
      cx.fillStyle = "#fff3b0"; cx.beginPath(); cx.ellipse(-c.w * .08, -bh - c.h * .04 * o, c.w * .12, c.h * .03 * o, 0, 0, TAU); cx.fill();
    } else if (c.glow > .3) {
      // lys, der siver ud af sprækken under låget
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = (c.glow - .3) * 1.4;
      cx.fillStyle = "#ffe07a"; cx.fillRect(-c.w * .44, -bh - c.h * .03, c.w * .88, c.h * .06);
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
    cx.save(); cx.translate(0, -bh - o * c.h * .24); cx.rotate(-o * .16); cx.scale(1, 1 - o * .35);
    cx.drawImage(img, 0, 0, iw, ih * sp + 1, -c.w / 2, -c.h * sp, c.w, c.h * sp + 1);
    cx.restore();
    cx.restore();
  }

  // lysvifte fra den åbne kiste
  function kisteLys() {
    const o = kiste.open; if (o < .02) return;
    const x = kiste.x, y = kiste.by - kiste.h * .6, L = S * 4.2;
    cx.save(); cx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * .3 + Math.sin(T * .8 + i) * .05 + (RM.matches ? 0 : T * .15 % .3), bw = .07;
      const gr = cx.createRadialGradient(x, y, 0, x, y, L);
      gr.addColorStop(0, `rgba(255,226,140,${.35 * o})`); gr.addColorStop(1, "rgba(255,226,140,0)");
      cx.fillStyle = gr; cx.beginPath(); cx.moveTo(x, y);
      cx.lineTo(x + Math.cos(a - bw) * L, y + Math.sin(a - bw) * L); cx.lineTo(x + Math.cos(a + bw) * L, y + Math.sin(a + bw) * L); cx.closePath(); cx.fill();
    }
    cx.restore();
  }

  function overfladeY(x) {
    const tid = RM.matches ? 0 : T;
    let y = surfY + Math.sin(x * .012 + tid * 1.3) * 2.2 + Math.sin(x * .027 - tid * 1.9) * 1.4;
    for (const r of ripples) {
      const front = r.t * S * 1.3, dd = Math.abs(Math.abs(x - r.x) - front), L = S * .8;
      if (dd < L) y += r.amp * Math.exp(-r.t * 1.4) * Math.cos(dd * .09) * (1 - dd / L);
    }
    return y;
  }

  function overflade() {
    // luften over vandet
    const trin = 14, pts = [];
    for (let x = 0; x <= W + trin; x += trin) pts.push([x, overfladeY(x)]);
    const gr = cx.createLinearGradient(0, 0, 0, surfY);
    gr.addColorStop(0, "#eefaff"); gr.addColorStop(1, "#c8edfc");
    cx.fillStyle = gr; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(W, 0);
    for (let i = pts.length - 1; i >= 0; i--) cx.lineTo(pts[i][0], pts[i][1]);
    cx.closePath(); cx.fill();
    // det lyse bånd lige under overfladen
    const ub = cx.createLinearGradient(0, surfY, 0, surfY + S * .45);
    ub.addColorStop(0, "rgba(255,255,255,.32)"); ub.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = ub; cx.fillRect(0, surfY - 3, W, S * .45);
    // vandlinjen
    cx.strokeStyle = "rgba(255,255,255,.95)"; cx.lineWidth = Math.max(2.5, S * .02); cx.lineJoin = "round";
    cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.stroke();
    cx.strokeStyle = "rgba(60,170,220,.35)"; cx.lineWidth = Math.max(2, S * .015);
    cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y + S * .03) : cx.moveTo(x, y + S * .03)); cx.stroke();
    // ringe i vandet
    for (const r of ripples) {
      const a = .55 * Math.exp(-r.t * 1.4), rx = r.t * S * 1.3 + 6;
      if (a < .03) continue;
      cx.strokeStyle = `rgba(255,255,255,${a})`; cx.lineWidth = 2;
      cx.beginPath(); cx.ellipse(r.x, surfY + 5, rx, rx * .12, 0, 0, Math.PI); cx.stroke();
    }
  }

  function tegnBobler() {
    for (const b of bubbles) cx.drawImage(SPR.boble, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    for (const b of bigs) {
      const r = b.r * (1 + .04 * Math.sin(T * 5 + b.ph));
      cx.globalAlpha = .95; cx.drawImage(SPR.boble, b.x - r, b.y - r, r * 2, r * 2); cx.globalAlpha = 1;
      // tydelig kant og et regnbueskær, så den store boble er nem at se og trykke på
      const lw = Math.max(2.5, r * .07);
      cx.lineWidth = lw; cx.strokeStyle = "rgba(255,255,255,.85)"; cx.beginPath(); cx.arc(b.x, b.y, r - lw / 2, 0, TAU); cx.stroke();
      cx.lineWidth = lw * 1.4;
      cx.strokeStyle = "rgba(255,150,220,.55)"; cx.beginPath(); cx.arc(b.x, b.y, r * .82, .2 + b.ph, 1.3 + b.ph); cx.stroke();
      cx.strokeStyle = "rgba(120,240,255,.55)"; cx.beginPath(); cx.arc(b.x, b.y, r * .82, 3.3 + b.ph, 4.2 + b.ph); cx.stroke();
    }
    for (const b of golds) {
      const r = b.r * (1 + .05 * Math.sin(T * 4 + b.ph)), g = r * 3.4;
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = .55 + .2 * Math.sin(T * 4 + b.ph);
      cx.drawImage(SPR.gul, b.x - g / 2, b.y - g / 2, g, g);
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
      cx.drawImage(SPR.guld, b.x - r, b.y - r, r * 2, r * 2);
    }
  }

  function tegnHjerter() {
    cx.save();
    cx.textAlign = "center"; cx.textBaseline = "middle"; cx.lineJoin = "round";
    for (const f of fish) {
      if (!maet(f) || f.scene) continue;
      const x0 = f.x + f.dir * f.w * .12, y0 = f.y + f.bob - f.h * .45;
      for (let i = 0; i < 1; i++) {
        const c = (T * .3 + f.ph * .16) % 1, t = c / .55; // hjertet stiger i lidt over halvdelen af tiden, så er der pause
        if (t >= 1) continue;
        const s = S * .1 * (.45 + .55 * clamp(f.z, 0, 1));
        cx.globalAlpha = Math.sin(t * Math.PI) * .55;
        cx.font = `800 ${s.toFixed(1)}px Grandstander, system-ui, sans-serif`;
        const x = x0 + Math.sin(t * 5 + i) * S * .08 + i * S * .09, y = y0 - t * S * .55;
        cx.lineWidth = s * .22; cx.strokeStyle = "rgba(160,40,90,.45)"; cx.strokeText("♥", x, y);
        cx.fillStyle = "#ff8fb8"; cx.fillText("♥", x, y);
      }
    }
    cx.restore();
  }

  function tegnFlager() {
    for (const fl of flakes) {
      const s = S * .075 * (.6 + .4 * fl.z);
      cx.globalAlpha = fl.bund ? clamp((14 - fl.liv) / 2, 0, 1) : 1;
      cx.save(); cx.translate(fl.x, fl.y);
      if (!fl.pille) { cx.rotate(fl.rot); cx.scale(1, .55 + .45 * Math.abs(Math.sin(fl.rot))); }
      cx.fillStyle = fl.c; cx.beginPath(); cx.ellipse(0, 0, s, s * .7, 0, 0, TAU); cx.fill();
      cx.fillStyle = "rgba(255,255,255,.55)"; cx.beginPath(); cx.ellipse(-s * .3, -s * .25, s * .35, s * .2, 0, 0, TAU); cx.fill();
      cx.restore();
    }
    cx.globalAlpha = 1;
  }

  // lag 0: i vandet, lag 1: dråber (også over vandet), lag 2: gnister øverst
  function tegnPartikler(lag) {
    for (const p of parts) {
      if ((p.t === "gnist" ? 2 : p.t === "draabe" ? 1 : 0) !== lag) continue;
      const k = p.liv / p.max;
      if (p.t === "gnist") {
        const s = p.s * (1 - k * .6) * (p.dr ? 1.2 : 1);
        cx.save(); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 1 - k;
        cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.drawImage(p.c === "rosa" ? SPR.rosa : SPR.stjerne, -s, -s, s * 2, s * 2);
        cx.restore();
      } else if (p.t === "blaek") {
        const s = p.s * (1 + k * 1.4); cx.globalAlpha = Math.min(1, (1 - k) * 1.6); cx.drawImage(SPR.blaek, p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.t === "draabe") {
        cx.globalAlpha = Math.min(1, (1 - k) * 2.5);
        cx.fillStyle = "rgba(70,170,225,.55)"; cx.beginPath(); cx.arc(p.x, p.y + p.s * .25, p.s * 1.15, 0, TAU); cx.fill();
        cx.fillStyle = "#f2fbff"; cx.beginPath(); cx.arc(p.x, p.y, p.s, 0, TAU); cx.fill();
      } else if (p.t === "taage") {
        const s = p.s * (1 + k); cx.globalAlpha = .55 * (1 - k); cx.drawImage(SPR.hvid, p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.t === "ring") {
        cx.globalAlpha = (p.blid ? .35 : .6) * (1 - k); cx.strokeStyle = "#fff"; cx.lineWidth = Math.max(2, S * .02);
        cx.beginPath(); cx.arc(p.x, p.y, p.s * (.3 + k * .7), 0, TAU); cx.stroke();
      } else if (p.t === "node") {
        cx.globalAlpha = Math.min(1, (1 - k) * 2); cx.fillStyle = p.c; cx.font = `800 ${p.s | 0}px ${skrift}`;
        cx.textAlign = "center"; cx.fillText(p.txt, p.x + Math.sin(p.liv * 4) * S * .06, p.y);
      }
    }
    cx.globalAlpha = 1;
  }

  // Natten: et mørkt lag i lav opløsning med huller, hvor noget lyser
  function natLag() {
    const m = Math.max(nightF * .68, dimLocal * .6);
    if (m < .01) return;
    const g = mork, w = morkCv.width, h = morkCv.height, k = w / W;
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(4,12,40,${m})`; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-out";
    const hul = (x, y, r, a) => {
      const gr = g.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.5, `rgba(0,0,0,${a * .55})`); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect((x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k);
    };
    const lys = [];
    for (const f of fish) {
      if (f.k === "lysfisk") {
        const s = Math.max(nightF, f.glow); if (s < .02) continue;
        const [x, y] = lokal(f, ...anker(f)); hul(x, y, S * 2.2 * (.7 + .3 * s), .95 * Math.min(1, s)); lys.push([x, y, S * .9 * s, "gul", .9]);
        hul(f.x, f.y, f.w * .8, .5 * s);
      } else if (f.k === "vandmand") {
        const s = Math.max(nightF, f.glow); if (s < .02) continue;
        const pu = .85 + .15 * Math.sin(T * 2.3);
        hul(f.x, f.y - f.h * .1, S * 1.3 * pu, .85 * s); lys.push([f.x, f.y - f.h * .15, f.w * 1.1 * pu, "rosa", .5 * s]);
      }
    }
    for (const b of golds) hul(b.x, b.y, b.r * 3.2, .8);
    if (kiste.glow > .05 || kiste.open > .05) hul(kiste.x, kiste.by - kiste.h * .5, kiste.w * 1.4, .7 * Math.max(kiste.glow, kiste.open));
    cx.drawImage(morkCv, 0, 0, W, H);
    cx.globalCompositeOperation = "lighter";
    for (const [x, y, r, s, a] of lys) { cx.globalAlpha = a; cx.drawImage(SPR[s], x - r, y - r, r * 2, r * 2); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    if (nightF > .02) {
      // måne og stjerner over vandet
      cx.globalAlpha = nightF;
      const mr = Math.min(surfY * .28, S * .32), mx = W * .68, my = surfY * .52;
      if (!portrait) {
        cx.globalCompositeOperation = "lighter"; cx.drawImage(SPR.hvid, mx - mr * 3, my - mr * 3, mr * 6, mr * 6); cx.globalCompositeOperation = "source-over";
        cx.fillStyle = "#fff6d8"; cx.beginPath(); cx.arc(mx, my, mr, 0, TAU); cx.fill();
        cx.fillStyle = "rgba(220,205,160,.6)"; cx.beginPath(); cx.arc(mx - mr * .3, my + mr * .1, mr * .18, 0, TAU); cx.arc(mx + mr * .3, my - mr * .25, mr * .12, 0, TAU); cx.fill();
      }
      // månens genskin på vandet
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = nightF * .35;
      const gx = portrait ? W * .5 : mx; cx.drawImage(SPR.hvid, gx - S * 1.2, surfY - S * .15, S * 2.4, S * .5);
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = nightF;
      cx.fillStyle = "#fff";
      for (const [x, y, r, i] of stjerner) { cx.globalAlpha = nightF * (.5 + .5 * Math.sin(T * 2 + i)); cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); }
      cx.globalAlpha = 1;
    }
  }

  function dim() {
    if (dimF < .01) return;
    cx.fillStyle = `rgba(4,16,44,${dimF})`; cx.fillRect(0, 0, W, H);
  }

  function spotlys(f) {
    if (f.spot < .03) return;
    const a = f.spot, x = f.x, top = surfY, w0 = f.w * .35, w1 = f.w * 1.1, y1 = f.y + f.h * .7;
    cx.save(); cx.globalCompositeOperation = "lighter";
    const gr = cx.createLinearGradient(0, top, 0, y1);
    gr.addColorStop(0, `rgba(255,244,200,${.28 * a})`); gr.addColorStop(1, `rgba(255,244,200,${.05 * a})`);
    cx.fillStyle = gr; cx.beginPath(); cx.moveTo(x - w0, top); cx.lineTo(x + w0, top); cx.lineTo(x + w1, y1); cx.lineTo(x - w1, y1); cx.closePath(); cx.fill();
    const g = Math.max(f.w, f.h) * 2; cx.globalAlpha = .5 * a; cx.drawImage(SPR.hvid, x - g / 2, f.y - g / 2, g, g);
    cx.restore();
  }

  const TEST_AV = {}; // til ydelsesmåling: lag der kan slås fra i test
  function tegn() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const av = TEST_AV;
    // lysstråler og lysnet er bløde, så de tegnes i halv opløsning på et eget lag og lægges på én gang
    if (!av.straaler) straaler(cx, .16 * (1 - nightF) * (1 - dimLocal), "255,250,225");
    // lysnettet på sandet er blødt, så det tegnes i halv opløsning og lægges på i ét stræk
    const sy0 = floorY - H * .05, sh = H - sy0;
    if (!av.kaustik && (1 - nightF * .85) * (1 - dimLocal * .7) > .02) {
      lysG.setTransform(lysCv.width / W, 0, 0, lysCv.height / sh, 0, -sy0 * lysCv.height / sh); lysG.clearRect(0, sy0, W, sh);
      kaustikker(lysG);
      cx.globalCompositeOperation = "lighter"; cx.drawImage(lysCv, 0, sy0, W, sh); cx.globalCompositeOperation = "source-over";
    }
    if (!av.tang) fjernTang();
    skygger();
    tegnSilhuetter();
    // dyr og pynt sorteret efter dybde, med et lag dis imellem, så det fjerne bliver blåligt
    if (!hazeGrad) { hazeGrad = cx.createLinearGradient(0, surfY, 0, H); hazeGrad.addColorStop(0, "#7fd6f0"); hazeGrad.addColorStop(1, "#1a6aa8"); }
    const helt = [], over = [];
    sorteret.length = 0;
    for (const d of decos) if (!d.front) sorteret.push(d);
    for (const e of aegs) sorteret.push(e);
    for (const f of fish) {
      if (f.x < -f.w * 1.2 || f.x > W + f.w * 1.2) continue; // uden for billedet
      // i spotlyset tegnes dyret øverst — men ikke under et trick, hvor det svømmer rundt (fx gemmer sig i koralen)
      const flytter = f.trick && f.trick.startet && f.trick.def.flyt;
      if ((f.scene && !flytter) || f.spot > .3) helt.push(f); else if (f.over) over.push(f); else sorteret.push(f);
    }
    sorteret.sort((a, b) => a.z - b.z);
    let lag = 0;
    const dis = a => { if (av.dis) return; cx.globalAlpha = a; cx.fillStyle = hazeGrad; cx.fillRect(0, surfY, W, H - surfY); cx.globalAlpha = 1; };
    for (const o of sorteret) {
      if (!lag && o.z >= .4) { dis(.28); lag = 1; }
      if (o.a) tegnFisk(o); else if (o.aeg) tegnAeg(o); else tegnPynt(o);
    }
    if (!lag) dis(.28);
    tegnFlager();
    tegnHjerter();
    tegnBobler();
    tegnPartikler(0);
    overflade();
    for (const f of over) tegnFisk(f);
    tegnPartikler(1);
    natLag();
    straaler(cx, .09 * nightF, "170,200,255");
    dim();
    if (kiste.front) { kisteLys(); tegnKiste(kiste); }
    for (const f of helt) { spotlys(f); tegnFisk(f); }
    tegnPartikler(2);
  }

  /* ---------- Start og stop ---------- */
  Spil.register({
    id: "akvariet", navn: "Akvariet", ikon: "🐠", farve: "#a8dcf5",
    start(r) {
      const keys = ["akva-hej", "akva-maet", "akva-alle-maette", "akva-mad", "akva-bobler", "akva-perle", "akva-kiste", "akva-kiste-hint", "akva-alle", "akva-nat", "akva-dag",
        "akva-bog", "akva-mangler", "akva-vokser", "akva-tryk-fisk", "tal-1", "tal-2", "tal-3", "tal-4", "tal-5", "ros-4",
        "akva-aeg", "akva-boble-unge", "akva-lille", "akva-nu-stor",
        ...ARTER.flatMap(a => ["akva-navn-" + a.k, "akva-ny-" + a.k, "akva-stor-" + a.k, "akva-unge-" + a.k])];
      Spil.preload(keys);
      alleBilleder().forEach(billede);
      sprites();
      alive = true; timers = []; T = 0; lastT = performance.now(); tidsFaktor = 1;
      try { skrift = getComputedStyle(document.body).fontFamily || "sans-serif"; } catch (e) {}
      fish = []; flakes = []; bubbles = []; golds = []; bigs = []; parts = []; ripples = []; sorteret = []; decos = null; aegs = [];
      night = false; nightF = 0; dimLocal = 0; dimF = 0; dimT = 0; scene = null; bogOpen = false; pointer = null;
      sidstRort = 0; hintN = 0; hjaelpUr = 24; udeUr = 8; nextGold = 3.5; sidstGuld = -9; paaVej = 0; haandVist = false; vokseHint = false; perleHint = 0; kisteHint = 0; maetSagt = false; alleSoverT = -99;
      nextSelv = 20; bobleUr = 0; kval = 2; frameStat = { n: 0, js: 0, dt: 0, sidstJs: 0, sidstDt: 0 }; hoert = new Set();

      // Dybe links (index.html?spil=akvariet&dyb=...): alle, kiste, nat, bog, fodre — og til test: ny, ny-<dyr>, trick-<dyr>
      const dyb = Spil.dyb || "";
      demo = !!dyb;
      const g = hent();
      gem = { fundet: START.slice(), mad: {}, lur: {}, perler: 0, ny: [], perleSagt: 0, unger: [], aeg: [], lyst: {} };
      if (g && !demo) {
        gem.fundet = [...new Set([...START, ...g.fundet.filter(k => ART[k])])];
        gem.mad = g.mad && typeof g.mad === "object" ? g.mad : {};
        gem.lur = g.lur && typeof g.lur === "object" ? g.lur : {}; // hvornår hver fisk vågner af sin lur
        gem.perler = clamp(+g.perler || 0, 0, PERLER - 1); gem.ny = Array.isArray(g.ny) ? g.ny.filter(k => ART[k]) : []; gem.perleSagt = g.perleSagt || 0;
        const arter = l => Array.isArray(l) ? [...new Set(l.filter(k => ART[k]))] : [];
        gem.unger = arter(g.unger); gem.aeg = arter(g.aeg).filter(k => !gem.unger.includes(k));
        gem.lyst = g.lyst && typeof g.lyst === "object" ? g.lyst : {};
      }
      if (dyb === "alle" || dyb.startsWith("trick-")) { gem.fundet = ARTER.map(a => a.k); ARTER.forEach((a, i) => { gem.mad[a.k] = i % 2 ? VOKS : i % 3; }); }
      if (dyb === "kiste") gem.perler = PERLER - 1;
      if (dyb === "nat") { gem.fundet = START.concat(["kuglefisk", "vandmand", "lysfisk", "kirurgfisk", "soehest"]); gem.mad = { lysfisk: VOKS, vandmand: VOKS, klovnfisk: VOKS }; }
      if (dyb === "bog") { gem.fundet = ARTER.slice(0, 9).map(a => a.k); ARTER.forEach((a, i) => { gem.mad[a.k] = i % 3 ? i % VOKS : VOKS; }); gem.ny = ["blaeksprutte"]; }
      if (dyb === "fodre") gem.mad = { klovnfisk: VOKS - 1, guldfisk: 2, krabbe: 1 };
      // unger: alle dyr er store, nogle har unger, og der ligger æg og en boble klar. aeg-snart: klovnfisken lægger et æg næste gang, den bliver mæt
      if (dyb === "unger") { gem.fundet = ARTER.map(a => a.k); ARTER.forEach(a => { gem.mad[a.k] = VOKS; }); gem.unger = ["guldfisk", "krabbe", "hval"]; gem.aeg = ["klovnfisk", "delfin", "soestjerne"]; }
      if (dyb === "aeg-snart") { gem.mad = { klovnfisk: VOKS, guldfisk: VOKS }; gem.lyst = { klovnfisk: AEG - 1 }; }
      if (dyb.startsWith("ny-") && ART[dyb.slice(3)]) { const k = dyb.slice(3); gem.fundet = ARTER.map(a => a.k).filter(x => x !== k); }
      if (demo) { haandVist = true; perleHint = 2; vokseHint = dyb !== "fodre"; }

      r.innerHTML = `<div class="ak">
        <canvas class="ak-bgc" aria-hidden="true"></canvas><canvas class="ak-cv" aria-label="Akvariet"></canvas>
        <div class="ak-skal ak-top" aria-label="Perler">${'<i class="ak-perle"></i>'.repeat(PERLER)}</div>
        <button class="ak-knap ak-natknap ak-top" aria-label="Nat">🌙</button>
        <button class="ak-knap ak-bogknap ak-top${gem.ny.length ? " ny" : ""}" aria-label="Akvariebog">📖</button>
        <div class="ak-navn"></div>
        <div class="ak-haand"${haandVist ? " hidden" : ""}>👆</div>
        <div class="ak-bog" hidden><div class="ak-side"><span class="ak-titel">Akvariebog</span><div class="ak-gitter"></div></div><div class="ak-fakta" hidden></div>
          <button class="ak-knap ak-luk" aria-label="Luk bogen">✕</button></div></div>`;
      root = r.querySelector(".ak");
      bgCv = root.querySelector(".ak-bgc"); bg = bgCv.getContext("2d");
      cv = root.querySelector(".ak-cv"); cx = cv.getContext("2d");
      morkCv = document.createElement("canvas"); mork = morkCv.getContext("2d");
      lysCv = document.createElement("canvas"); lysG = lysCv.getContext("2d");
      maal();
      fish = gem.fundet.map(k => nyFisk(k));
      for (const k of gem.unger) { const m = foraelder(k); if (m) fish.push(nyFisk(k, m.x - m.dir * m.w * .7, m.y, m)); }
      for (const k of gem.aeg) { const m = foraelder(k); if (m) nytAeg(k, m); }
      startUde();
      tegnPerler();

      cv.addEventListener("pointerdown", ned);
      cv.addEventListener("pointermove", flyt);
      addEventListener("pointerup", op); addEventListener("pointercancel", op);
      addEventListener("resize", maal);
      q(".ak-bogknap").onclick = () => { Spil.sfx.click(); bogOpen ? lukBog() : aabnBog(); };
      q(".ak-luk").onclick = () => { Spil.sfx.click(); lukBog(); };
      q(".ak-bog").onclick = e => { if (e.target.classList.contains("ak-bog")) lukBog(); };
      q(".ak-natknap").onclick = () => { if (!scene) skiftNat(!night); };
      // når billederne er hentet, kendes deres rigtige form
      alleBilleder().forEach(n => { const i = billede(n); if (!klar(i)) i.addEventListener("load", () => { if (alive && root && root.isConnected) placerPynt(); }, { once: true }); });

      if (dyb === "kiste") { nextGold = 1e9; later(() => golds.push({ x: W * .5, y: H * .62, r: S * .3, ph: 0, vy: -S * .1, x0: W * .5, t: 0 }), 300); }
      if (dyb === "nat") { night = true; nightF = 1; const k = q(".ak-natknap"); k.textContent = "☀️"; k.classList.add("nat"); nextSelv = 1e9; }
      if (dyb === "bog") later(aabnBog, 400);
      if (dyb === "fodre") {
        nextGold = 1e9;
        const f = foraelder("klovnfisk"); f.x = W * .5; f.y = surfY + S * 1.3; f.z = f.tz = .8; f.dir = 1;
      }
      if (dyb === "ny" || dyb.startsWith("ny-")) { nextGold = 1e9; later(() => { gem.perler = PERLER; tegnPerler(); aabnKiste(); }, 600); }
      if (dyb.startsWith("trick-") && ART[dyb.slice(6)]) {
        nextGold = 1e9; nextSelv = 1e9;
        later(() => { const f = foraelder(dyb.slice(6)); if (f) visFisk(f); }, 700);
      }
      if (dyb === "alle" || dyb === "unger" || dyb === "aeg-snart") nextSelv = 1e9;
      if (dyb === "unger" || dyb === "aeg-snart") nextGold = 1e9;
      if (!demo) later(() => Spil.say("Velkommen i akvariet! Giv fiskene mad! Tryk her oppe ved vandet.", null, ["akva-hej", "akva-mad"]), 500);
      lastT = performance.now(); raf = requestAnimationFrame(step);
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf); raf = 0;
      removeEventListener("pointerup", op); removeEventListener("pointercancel", op); removeEventListener("resize", maal);
      if (master) { try { master.gain.value = 0; master.disconnect(); } catch (e) {} master = null; }
      fish = []; flakes = []; bubbles = []; golds = []; bigs = []; parts = []; aegs = []; scene = null; pointer = null;
    }
  });

  // Til test: et øjebliksbillede af akvariet (bruges af test-scripts, ikke af spillet)
  Spil.akvarieTest = () => alive ? ({
    W, H, surfY, floorY, S, night, scene: scene && scene.kind, fase: scene && scene.fase, perler: gem.perler, fundet: gem.fundet.slice(), bog: bogOpen,
    fish: fish.map(f => ({ k: f.k, x: f.x, y: f.y + f.bob, w: f.w, h: f.h, grown: f.grown, mad: f.mad, trick: !!f.trick, z: f.z, unge: f.unge, maet: maet(f) })),
    aeg: aegs.map(e => ({ k: e.k, x: e.x, y: e.y, r: e.r, boble: e.boble })), unger: gem.unger.slice(), gemtAeg: gem.aeg.slice(), lyst: { ...gem.lyst },
    sil: fish.filter(f => vaek(f) && f.ude.sil).map(f => ({ k: f.k, x: f.ude.sil.x, y: f.ude.sil.y, a: f.ude.sil.a })),
    golds: golds.map(b => ({ x: b.x, y: b.y, r: b.r })), bigs: bigs.map(b => ({ x: b.x, y: b.y, r: b.r, fri: b.fri })),
    kiste: kiste && { x: kiste.x, y: kiste.by - kiste.h / 2 }, flakes: flakes.length, kval, ms: frameStat && { js: frameStat.sidstJs, dt: frameStat.sidstDt },
  }) : null;
  Spil.akvarieTest.fastKval = () => { if (frameStat) frameStat.test = true; };
  Spil.akvarieTest.tid = f => { tidsFaktor = f; };
  Spil.akvarieTest.av = (k, v) => { TEST_AV[k] = v; }; // langsom gengivelse til skærmbilleder
})();
