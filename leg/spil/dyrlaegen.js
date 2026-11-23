// Spil: Dyrlægen — hjælp søde dyr med at blive raske på dyreklinikken (for 3–5 år, men også nemt for yngre).
// 1) Venteværelse: vælg selv mellem 3 dyr (man kan ane, hvad de fejler).
// 2) Undersøgelsesbordet: hvert dyr har 1–2 opgaver:
//    - Røntgen (🔍 → 🤏): kør røntgen-luppen hen over maven, se skelettet og opdag en skør ting dyret har slugt
//      (støvle, sok, fisk, nøgle, klods), og træk den ud med pincetten!
//    - Splint + Plaster (🤏 → 🩹): 2-trins behandling! Træk først splinten ud med pincetten, og vælg derefter et farverigt plaster.
//    - Feber (🧊): køl den varme pande ned med isterningen, mens termometeret falder.
//    - Snue (🧻): tør den løbende næse væk med lommetørklædet.
//    - Hjerte (🩺): lyt til hjertet på brystet (rytmiske hjerteslag i Web Audio).
//    Mål-ringen vises ikke med det samme (kun som blid hjælp efter et par sekunder), så barnet selv får lov at opdage.
// 3) Godbid & fejring: når dyret er raskt, giver barnet det en godbid, dyret hopper glad op med sin rigtige dyrelyd (dyr-<id>)
//    og gemmes på "Raske venner"-tavlen (localStorage "lk-dyrlaegen").
(function () {
  const GEM = "lk-dyrlaegen";
  const roligt = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  // De 8 dyr — alle har WebP-sprite i billeder/dyrlaegen/<id>.webp og rigtig dyrelyd i lyd/dyr-<id>.mp3
  // Ankerpunkter i overlay viewBox 0 0 260 260 (kvadratisk, bund-centreret som spritesne)
  const DYR = [
    {
      id: "hund", navn: "Hunden", ikon: "🐶", godbid: "🦴",
      kommer: "Se, her kommer hunden! Den har brug for hjælp.",
      anker: { pande: [130, 58], naese: [130, 102], bryst: [130, 168], mave: [130, 184], skramme: [96, 212] }
    },
    {
      id: "kat", navn: "Katten", ikon: "🐱", godbid: "🐟",
      kommer: "Se, her kommer katten! Den har brug for hjælp.",
      anker: { pande: [130, 68], naese: [130, 108], bryst: [130, 174], mave: [130, 190], skramme: [152, 214] }
    },
    {
      id: "ko", navn: "Koen", ikon: "🐮", godbid: "🌿",
      kommer: "Se, her kommer koen! Den har brug for hjælp.",
      anker: { pande: [130, 66], naese: [130, 118], bryst: [130, 178], mave: [130, 192], skramme: [94, 214] }
    },
    {
      id: "gris", navn: "Grisen", ikon: "🐷", godbid: "🍎",
      kommer: "Se, her kommer grisen! Den har brug for hjælp.",
      anker: { pande: [130, 68], naese: [130, 112], bryst: [130, 176], mave: [130, 192], skramme: [154, 212] }
    },
    {
      id: "elefant", navn: "Elefanten", ikon: "🐘", godbid: "🥜",
      kommer: "Se, her kommer elefanten! Den har brug for hjælp.",
      anker: { pande: [130, 62], naese: [156, 134], bryst: [130, 180], mave: [130, 194], skramme: [96, 212] }
    },
    {
      id: "froe", navn: "Frøen", ikon: "🐸", godbid: "🍓",
      kommer: "Se, her kommer frøen! Den har brug for hjælp.",
      anker: { pande: [130, 56], naese: [130, 74], bryst: [130, 176], mave: [130, 190], skramme: [164, 216] }
    },
    {
      id: "abe", navn: "Aben", ikon: "🐵", godbid: "🍌",
      kommer: "Se, her kommer aben! Den har brug for hjælp.",
      anker: { pande: [130, 56], naese: [130, 110], bryst: [130, 180], mave: [130, 196], skramme: [96, 212] }
    },
    {
      id: "faar", navn: "Fåret", ikon: "🐑", godbid: "🥕",
      kommer: "Se, her kommer fåret! Det har brug for hjælp.",
      anker: { pande: [130, 74], naese: [130, 112], bryst: [130, 178], mave: [130, 194], skramme: [154, 212] }
    }
  ];

  // Skøre ting dyret kan have slugt (opdages med røntgen-scanneren!)
  const SLUGT = [
    { ikon: "🥾", navn: "gummistøvle" },
    { ikon: "🧦", navn: "sok" },
    { ikon: "🔑", navn: "nøgle" },
    { ikon: "🧱", navn: "klods" },
    { ikon: "🐟", navn: "fisk" },
    { ikon: "🧸", navn: "lille bamse" }
  ];

  const GODBIDDER = ["🦴", "🍎", "🥕", "🍌", "🐟", "🍓", "🌿", "🥜"];

  // De 6 redskaber i bakken
  const REDSKABER = [
    { id: "roentgen", ikon: "🔍", navn: "Røntgen", farve: "#e4e2ff",
      hintKey: "dyrl-hint-roentgen", hintTekst: "Prøv røntgen-luppen! Tryk på forstørrelsesglasset nede i bunden." },
    { id: "pincet", ikon: "🤏", navn: "Pincet", farve: "#ffe8f0",
      hintKey: "dyrl-hint-pincet", hintTekst: "Prøv pincetten! Tryk på pincetten nede i bunden." },
    { id: "plaster", ikon: "🩹", navn: "Plaster", farve: "#ffe4d6",
      hintKey: "dyrl-hint-plaster", hintTekst: "Prøv plasteret! Tryk på plasteret nede i bunden." },
    { id: "stetoskop", ikon: "🩺", navn: "Stetoskop", farve: "#dceeff",
      hintKey: "dyrl-hint-stetoskop", hintTekst: "Prøv stetoskopet! Tryk på stetoskopet nede i bunden." },
    { id: "klud", ikon: "🧊", navn: "Isterning", farve: "#d6f5ff",
      hintKey: "dyrl-hint-klud", hintTekst: "Prøv isterningen! Tryk på isterningen nede i bunden." },
    { id: "papir", ikon: "🧻", navn: "Lommetørklæde", farve: "#fff3d1",
      hintKey: "dyrl-hint-papir", hintTekst: "Prøv lommetørklædet! Tryk på papiret nede i bunden." }
  ];

  const PLASTRE = [
    { id: "roed", bg: "#ff6b6b", kant: "#d94848", pynt: "❤️" },
    { id: "blaa", bg: "#4d96ff", kant: "#2b6fd6", pynt: "⭐" },
    { id: "gul", bg: "#ffd13b", kant: "#d9a416", pynt: "😊" },
    { id: "groen", bg: "#5cc46b", kant: "#3b9c49", pynt: "🍀" },
    { id: "lilla", bg: "#b57dff", kant: "#864fd9", pynt: "🦄" }
  ];

  const OPGAVE_INFO = {
    splint: {
      ikon: "🩹",
      startKey: "dyrl-splint", startTekst: "Uha! Der sidder en lille splint i poten! Brug pincetten først, og træk den ud!",
      trin2Key: "dyrl-splint-ud", trin2Tekst: "Svup! Splinten er ude! Nu skal der et fint plaster på!",
      okKey: "dyrl-plaster-ok", okTekst: "Så kom der et fint plaster på!"
    },
    roentgen: {
      ikon: "❓",
      startKey: "dyrl-roentgen", startTekst: "Hmm, maven knurrer mærkeligt! Brug røntgen-luppen, og kig ind i maven!",
      trin2Key: "dyrl-roentgen-fundet", trin2Tekst: "Hov! Hvad har den dog spist? Brug pincetten, og tag den ud!",
      okKey: "dyrl-roentgen-ud", okTekst: "Svup! Så er maven helt glad igen!"
    },
    feber: {
      ikon: "🤒",
      startKey: "dyrl-feber", startTekst: "Uha, panden er helt varm! Vælg isterningen, og køl den ned!",
      okKey: "dyrl-feber-ok", okTekst: "Åh, det køler dejligt! Feberen er væk!"
    },
    snue: {
      ikon: "🤧",
      startKey: "dyrl-snue", startTekst: "Atju! Næsen løber! Vælg lommetørklædet, og tør næsen!",
      okKey: "dyrl-snue-ok", okTekst: "Så er næsen helt ren og tør!"
    },
    hjerte: {
      ikon: "🩺",
      startKey: "dyrl-hjerte", startTekst: "Lad os lytte til hjertet! Vælg stetoskopet, og hold det på maven!",
      okKey: "dyrl-hjerte-ok", okTekst: "Hjertet slår så fint!"
    }
  };

  Spil.css("css-dyrlaegen", `
    .dl{position:relative;height:100%;overflow:hidden;touch-action:none;
      background:linear-gradient(180deg,#dff6ee 0%,#eefaf5 58%,#f8f2e4 58%,#eedfc5 100%)}
    .dl *{touch-action:none}

    /* Klinik-baggrund: vindue, rødt kors og undersøgelsesbord */
    .dl-vindue{position:absolute;left:max(18px,6%);top:clamp(74px,12vh,118px);
      width:clamp(74px,13vw,144px);aspect-ratio:1.1;border-radius:20px;pointer-events:none;
      background:linear-gradient(#9bd7f7,#d7f1ff 72%,#b5e39e 72%);border:7px solid #fff;
      box-shadow:0 6px 0 rgba(31,58,95,.1),inset 0 0 0 3px rgba(31,58,95,.07)}
    .dl-vindue::before{content:"";position:absolute;inset:0;
      background:linear-gradient(90deg,transparent 47%,#fff 47% 53%,transparent 53%),
        linear-gradient(0deg,transparent 47%,#fff 47% 53%,transparent 53%)}
    .dl-vindue::after{content:"";position:absolute;right:14%;top:14%;width:22%;aspect-ratio:1;border-radius:50%;
      background:#ffe066;box-shadow:0 0 12px #ffe066}

    .dl-kors{position:absolute;right:max(18px,6%);top:clamp(76px,13vh,122px);
      width:clamp(52px,8vw,80px);aspect-ratio:1;border-radius:20px;background:#fff;pointer-events:none;
      box-shadow:0 5px 0 rgba(31,58,95,.1);display:flex;align-items:center;justify-content:center}
    .dl-kors::before,.dl-kors::after{content:"";position:absolute;background:#ff6b6b;border-radius:6px}
    .dl-kors::before{width:54%;height:20%}
    .dl-kors::after{width:20%;height:54%}

    /* Raske-venner-knap øverst til højre */
    .dl-raske{position:absolute;z-index:12;top:calc(2vh + env(safe-area-inset-top,0px));
      right:max(16px,env(safe-area-inset-right,0px));
      height:clamp(54px,8vh,74px);padding:0 clamp(14px,2.2vw,22px);border-radius:99px;
      background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.22);
      display:flex;align-items:center;gap:8px;font-weight:800;font-size:clamp(22px,3.6vh,34px)}
    .dl-raske:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(31,58,95,.22)}
    .dl-raske.pop{animation:dl-pop .45s ease-out}

    /* Undersøgelsesbordet */
    .dl-bord{position:absolute;left:50%;bottom:clamp(192px,26.5vh,234px);translate:-50% 0;
      width:min(86vw,680px);height:clamp(48px,7.8vh,74px);border-radius:26px 26px 14px 14px;pointer-events:none;
      background:linear-gradient(#e6b984,#cf9a60);box-shadow:0 10px 0 rgba(120,76,34,.22),inset 0 6px 0 rgba(255,255,255,.35)}
    .dl-bord::after{content:"";position:absolute;left:12%;right:12%;top:8px;height:clamp(14px,2.4vh,22px);
      border-radius:99px;background:rgba(255,255,255,.55)}

    /* Dyre-scenen: billede + præcist SVG-overlay ovenpå */
    .dl-scene{position:absolute;left:50%;bottom:clamp(214px,29.5vh,260px);translate:-50% 0;z-index:4;
      width:min(76vw,46vh,400px);aspect-ratio:1;display:flex;align-items:center;justify-content:center;
      transition:transform .45s cubic-bezier(.34,1.35,.64,1),opacity .35s}
    .dl-scene.ind{transform:translateX(85vw);opacity:0}
    .dl-scene.ud{transform:translateX(-85vw);opacity:0}
    .dl-scene.glad{animation:dl-hop .55s ease-in-out 3}
    .dl-scene.nys{animation:dl-nys .38s ease-in-out}
    .dl-scene.gumle{animation:dl-gumle .32s ease-in-out 3}
    .dl-dyr-img{width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;
      -webkit-user-drag:none;filter:drop-shadow(0 10px 10px rgba(31,58,95,.16));transition:filter .35s}
    .dl-scene.av .dl-dyr-img{filter:drop-shadow(0 10px 10px rgba(31,58,95,.16)) saturate(.92)}
    .dl-over{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}

    @keyframes dl-hop{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-24px) scale(1.05)}}
    @keyframes dl-nys{0%,100%{transform:translateY(0) rotate(0)}35%{transform:translateY(-8px) rotate(-5deg)}65%{transform:translateY(6px) rotate(4deg)}}
    @keyframes dl-gumle{0%,100%{transform:scale(1,1)}50%{transform:scale(1.06,.94)}}
    @keyframes dl-pop{45%{transform:scale(1.18)}}

    /* Blid hjælpe-ring (vises først efter lidt tid, så de ældre selv kan opdage) */
    .dl-maal{fill:rgba(255,255,255,.18);stroke:#ff6b6b;stroke-width:4;stroke-dasharray:8 6;
      animation:dl-puls 1.3s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
    .dl-maal.hjerte{stroke:#ff6b9d}
    .dl-maal.feber{stroke:#4db8ff}
    .dl-maal.snue{stroke:#f5a623}
    .dl-maal.roentgen{stroke:#7c6bff}
    @keyframes dl-puls{0%,100%{transform:scale(.94);opacity:.72}50%{transform:scale(1.1);opacity:1}}

    /* Termometer-indikator ved feber */
    .dl-termo{position:absolute;right:max(18px,16%);top:34%;width:clamp(36px,5.5vh,50px);height:clamp(110px,20vh,164px);
      border-radius:99px;background:#fff;box-shadow:0 6px 0 rgba(31,58,95,.18);padding:6px;box-sizing:border-box;
      display:flex;flex-direction:column;justify-content:flex-end;align-items:center;pointer-events:none;z-index:6}
    .dl-termo[hidden]{display:none}
    .dl-termo-bar{width:62%;border-radius:99px;transition:height .25s,background .35s;background:#ff5c5c}
    .dl-termo-kugle{width:88%;aspect-ratio:1;border-radius:50%;margin-top:-6px;transition:background .35s;background:#ff5c5c}

    /* Hjerte-fremgangsbar ved stetoskop */
    .dl-hjerte-bar{position:absolute;left:50%;top:calc(12vh + env(safe-area-inset-top,0px));translate:-50% 0;z-index:7;pointer-events:none;
      padding:6px 14px;border-radius:99px;background:rgba(255,255,255,.94);box-shadow:0 4px 0 rgba(31,58,95,.16);
      display:flex;align-items:center;gap:8px;font-size:clamp(22px,3.6vh,32px)}
    .dl-hjerte-bar[hidden]{display:none}
    .dl-hjerte-bar .dl-hp{width:clamp(76px,14vw,120px);height:14px;border-radius:99px;background:#ffe0ea;overflow:hidden}
    .dl-hjerte-bar .dl-hp i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#ff6b9d,#ff477e);transition:width .12s}

    /* Tjek-bobler over dyret (viser antal opgaver; bruger ? ved hemmelig røntgen) */
    .dl-opgaver{position:absolute;left:50%;top:calc(2.2vh + env(safe-area-inset-top,0px));translate:-50% 0;z-index:8;
      display:flex;gap:12px;pointer-events:none}
    .dl-opg{width:clamp(54px,8vh,74px);aspect-ratio:1;border-radius:50%;background:var(--card);
      box-shadow:0 5px 0 rgba(31,58,95,.18);display:flex;align-items:center;justify-content:center;
      font-size:clamp(28px,4.5vh,42px);position:relative;transition:transform .25s,background .25s}
    .dl-opg.aktiv{outline:4px solid #ff9f43;transform:scale(1.08)}
    .dl-opg.klar{background:#c9f5cf;transform:scale(.95)}
    .dl-opg.klar::after{content:"✓";position:absolute;right:-4px;bottom:-4px;width:24px;height:24px;border-radius:50%;
      background:#3ab554;color:#fff;font:800 15px/24px system-ui,sans-serif;text-align:center}

    /* Plaster-farvevælger lige over bakken */
    .dl-farver{position:absolute;left:50%;bottom:calc(clamp(108px,16.5vh,144px) + env(safe-area-inset-bottom,0px));
      translate:-50% 0;z-index:10;display:flex;gap:clamp(8px,1.8vw,16px);padding:8px 14px;border-radius:99px;
      background:rgba(255,253,247,.94);box-shadow:0 5px 0 rgba(31,58,95,.18)}
    .dl-farver[hidden]{display:none}
    .dl-farve{width:clamp(56px,8vh,72px);aspect-ratio:1;border-radius:50%;border:5px solid #fff;
      box-shadow:0 4px 0 rgba(31,58,95,.22);display:flex;align-items:center;justify-content:center;
      font-size:clamp(24px,3.6vh,32px);transition:transform .15s;padding:0}
    .dl-farve.valgt{transform:translateY(-8px) scale(1.12);outline:4px solid var(--ink)}

    /* Godbid-vælger når dyret er raskt! */
    .dl-godbakke{position:absolute;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));translate:-50% 0;z-index:12;
      display:flex;gap:clamp(14px,3vw,28px);padding:12px 22px;border-radius:36px;
      background:rgba(255,253,247,.96);box-shadow:0 8px 0 rgba(31,58,95,.2)}
    .dl-godbakke[hidden]{display:none}
    .dl-godbid{width:clamp(74px,12vh,108px);aspect-ratio:1;border-radius:26px;background:#fff4d6;
      box-shadow:0 6px 0 rgba(31,58,95,.2);font-size:clamp(42px,7vh,64px);
      display:flex;align-items:center;justify-content:center;transition:transform .15s;
      animation:dl-hop-knap 1.3s ease-in-out infinite}
    .dl-godbid:active{transform:scale(.92)}

    /* Værktøjsbakken i bunden (6 redskaber) */
    .dl-bakke{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));translate:-50% 0;z-index:9;
      display:flex;gap:clamp(8px,1.8vw,18px);padding:10px clamp(12px,2vw,22px);border-radius:30px;
      background:rgba(255,253,247,.94);box-shadow:0 8px 0 rgba(31,58,95,.18)}
    .dl-bakke[hidden]{display:none}
    .dl-tool{width:clamp(64px,10.5vh,94px);aspect-ratio:1;border-radius:22px;
      box-shadow:0 6px 0 rgba(31,58,95,.22);display:flex;align-items:center;justify-content:center;
      font-size:clamp(34px,5.6vh,52px);line-height:1;padding:0;transition:transform .16s,box-shadow .16s;
      font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif}
    .dl-tool:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(31,58,95,.22)}
    .dl-tool.valgt{transform:translateY(-10px) scale(1.08);outline:5px solid var(--ink);
      box-shadow:0 12px 0 rgba(31,58,95,.22)}
    .dl-tool.hint{animation:dl-vink 1s ease-in-out infinite}
    @keyframes dl-vink{0%,100%{transform:translateY(0) rotate(0)}35%{transform:translateY(-8px) rotate(-7deg)}70%{transform:translateY(-8px) rotate(7deg)}}

    /* Næste-patient-knap (tilbage til venteværelset) */
    .dl-naeste{position:absolute;right:max(18px,env(safe-area-inset-right,0px));
      bottom:calc(clamp(124px,18vh,160px) + env(safe-area-inset-bottom,0px));z-index:11;
      width:clamp(74px,12vh,108px);aspect-ratio:1;border-radius:50%;background:#63d471;color:#fff;
      box-shadow:0 6px 0 rgba(31,58,95,.25);font-size:clamp(38px,6.5vh,58px);
      display:flex;align-items:center;justify-content:center;animation:dl-hop-knap 1.2s ease-in-out infinite}
    .dl-naeste[hidden]{display:none}
    .dl-naeste:active{transform:translateY(4px)}
    @keyframes dl-hop-knap{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}

    /* Flyvende redskabs-markør under fingeren */
    .dl-markoer{position:fixed;z-index:25;pointer-events:none;font-size:clamp(46px,7.5vh,68px);
      translate:-50% -65%;filter:drop-shadow(0 6px 6px rgba(31,58,95,.25));
      font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif}
    .dl-markoer[hidden]{display:none}

    /* Små partikler */
    .dl-part{position:fixed;z-index:24;pointer-events:none;font-size:28px;animation:dl-stiger .85s ease-out forwards}
    @keyframes dl-stiger{0%{transform:translate(-50%,-50%) scale(.7);opacity:1}
      100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.25);opacity:0}}

    /* Venteværelse (vælg mellem 3 dyr!) */
    .dl-vente{position:absolute;inset:0;z-index:15;
      background:linear-gradient(180deg,#dff6ee 0%,#eefaf5 62%,#f4e6cc 62%,#e8d3ad 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(18px,3.5vh,34px);
      padding:calc(68px + env(safe-area-inset-top,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px));box-sizing:border-box}
    .dl-vente[hidden]{display:none}
    .dl-vente-baenk{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(14px,3vw,32px);max-width:920px}
    .dl-patient-kort{position:relative;width:clamp(148px,26vw,250px);aspect-ratio:.9;border-radius:34px;
      background:var(--card);box-shadow:0 10px 0 rgba(31,58,95,.18);padding:14px 12px 10px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .16s}
    .dl-patient-kort:active{transform:translateY(6px);box-shadow:0 4px 0 rgba(31,58,95,.18)}
    .dl-patient-kort img{width:84%;height:84%;object-fit:contain;pointer-events:none}
    .dl-patient-boble{position:absolute;top:-12px;right:-10px;min-width:48px;height:48px;padding:0 10px;border-radius:99px;
      background:#fff;box-shadow:0 4px 0 rgba(31,58,95,.18);border:3px solid #ff9f43;
      display:flex;align-items:center;justify-content:center;gap:4px;font-size:24px}

    /* Raske venner-galleri */
    .dl-gal{position:absolute;inset:0;z-index:18;background:rgba(223,246,238,.97);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
      padding:calc(74px + env(safe-area-inset-top,0px)) 20px calc(24px + env(safe-area-inset-bottom,0px));box-sizing:border-box}
    .dl-gal[hidden]{display:none}
    .dl-gal-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(10px,2.2vw,20px);max-width:780px}
    .dl-gal-kort{width:clamp(84px,16vw,146px);aspect-ratio:1;border-radius:26px;background:var(--card);
      box-shadow:0 6px 0 rgba(31,58,95,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:2px;padding:8px;transition:transform .15s}
    .dl-gal-kort img{width:70%;height:70%;object-fit:contain;pointer-events:none}
    .dl-gal-kort:active{transform:scale(.94)}
    .dl-gal-kort.uproevet{opacity:.38;filter:grayscale(1)}
    .dl-gal-kort small{font-size:clamp(14px,2.2vh,20px);font-weight:800;color:var(--ink)}
    .dl-gal-luk{width:clamp(68px,10vh,88px);aspect-ratio:1;border-radius:50%;background:var(--card);
      box-shadow:0 5px 0 rgba(31,58,95,.22);font-size:clamp(32px,5vh,44px)}

    /* Telefon på højkant: 2 rækker á 3 store redskaber */
    @media (max-aspect-ratio:1/1){
      .dl-vindue{top:clamp(68px,10vh,96px);width:clamp(64px,17vw,96px)}
      .dl-kors{top:clamp(74px,11vh,102px);width:clamp(46px,12vw,64px)}
      .dl-termo{right:12px;top:27%}
      .dl-bord{width:92vw;bottom:clamp(218px,28vh,268px)}
      .dl-scene{width:min(78vw,38vh);bottom:clamp(238px,30.5vh,294px)}
      .dl-bakke{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px 14px;border-radius:26px}
      .dl-tool{width:clamp(68px,21vw,86px);font-size:clamp(34px,9vw,46px)}
      .dl-farver{bottom:calc(clamp(176px,24vh,212px) + env(safe-area-inset-bottom,0px))}
      .dl-farve{width:clamp(50px,13vw,62px)}
      .dl-patient-kort{width:clamp(134px,40vw,176px)}
    }
    @media (prefers-reduced-motion:reduce){
      .dl-scene.glad,.dl-scene.nys,.dl-scene.gumle,.dl-maal,.dl-tool.hint,.dl-naeste,.dl-godbid,.dl-part{animation:none}
    }
  `);

  /* ---------- Overlay SVG oven på WebP-dyret (viewBox 0 0 260 260) ---------- */
  function tegnOverlay(dyr, tilstand) {
    let over = "";
    const a = dyr.anker;

    // 1. Feber (rød pande + varmebølger)
    if (tilstand.feber > 0) {
      const op = Math.min(1, tilstand.feber);
      const [px, py] = a.pande;
      over += `<g opacity="${op.toFixed(2)}">
        <ellipse cx="${px}" cy="${py}" rx="34" ry="15" fill="#ff5252" opacity=".46"/>
        <path d="M${px - 22} ${py - 18} q4 -9 0 -18 M${px} ${py - 23} q4 -9 0 -18 M${px + 22} ${py - 18} q4 -9 0 -18"
          fill="none" stroke="#ff5c5c" stroke-width="4" stroke-linecap="round"/>
      </g>`;
    }

    // 2. Snue (dråbe ved næsen)
    if (tilstand.snue > 0) {
      const [nx, ny] = a.naese;
      const sc = 0.55 + tilstand.snue * 0.6;
      over += `<g transform="translate(${nx + 6},${ny + 6}) scale(${sc.toFixed(2)})">
        <path d="M0 0 C9 13 11 24 0 26 C-11 24 -9 13 0 0 Z" fill="#7cd4ff" stroke="#3aa0db" stroke-width="2.5"/>
        <ellipse cx="-2.5" cy="15" rx="2.4" ry="4.5" fill="#fff" opacity=".85"/>
      </g>`;
    }

    // 3. Splint + Skramme → Plaster (2-trins behandling!)
    if (tilstand.splintTrin === 1) {
      // Skramme MED en lille brun splint der stikker ud!
      const [sx, sy] = a.skramme;
      over += `<g transform="translate(${sx},${sy})">
        <ellipse rx="18" ry="12" fill="#ff5c5c" opacity=".78"/>
        <path d="M-4 0 L18 -14 L14 -19 L-6 -4 Z" fill="#8b5a2b" stroke="#4a2e12" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="-2" cy="-1" r="4" fill="#d93636"/>
      </g>`;
    } else if (tilstand.splintTrin === 2) {
      // Splinten er trukket ud — nu mangler bare plasteret!
      const [sx, sy] = a.skramme;
      over += `<g transform="translate(${sx},${sy})">
        <ellipse rx="17" ry="11" fill="#ff6b6b" opacity=".72"/>
        <path d="M-8 -3 L8 3 M-6 4 L7 -4" stroke="#b82323" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    } else if (tilstand.plaster) {
      const [sx, sy] = a.skramme;
      const pl = tilstand.plaster;
      over += `<g transform="translate(${sx},${sy}) rotate(-16)">
        <rect x="-28" y="-13" width="56" height="26" rx="12" fill="${pl.bg}" stroke="${pl.kant}" stroke-width="3"/>
        <rect x="-11" y="-11" width="22" height="22" rx="4" fill="rgba(255,255,255,.35)"/>
        <text x="0" y="6" text-anchor="middle" font-size="15">${pl.pynt}</text>
      </g>`;
    }

    // 4. Røntgen-objekt der lyser op når det er fundet (og skal trækkes ud med pincet)
    if (tilstand.roentgenTrin === 2 && tilstand.slugt) {
      const [mx, my] = a.mave;
      over += `<g transform="translate(${mx},${my})">
        <circle r="34" fill="rgba(22,42,88,.84)" stroke="#6fe3ff" stroke-width="4"/>
        <text x="0" y="12" text-anchor="middle" font-size="34">${tilstand.slugt.ikon}</text>
      </g>`;
    }

    // 5. Aktiv røntgen-cirkel der følger fingeren (viser ribben + slugt ting!)
    if (roentgenPos && valgtTool === "roentgen" && !fejre) {
      const rx = roentgenPos.x, ry = roentgenPos.y;
      const [mx, my] = a.mave;
      const [bx, by] = a.bryst;
      over += `<defs><clipPath id="dl-xclip"><circle cx="${rx}" cy="${ry}" r="48"/></clipPath></defs>
        <g clip-path="url(#dl-xclip)">
          <circle cx="${rx}" cy="${ry}" r="48" fill="rgba(16,32,74,.9)"/>
          <g stroke="#8be9ff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7">
            <line x1="${bx}" y1="${by - 28}" x2="${bx}" y2="${by + 34}"/>
            <path d="M${bx - 28} ${by - 16} Q${bx} ${by - 22} ${bx + 28} ${by - 16}"/>
            <path d="M${bx - 32} ${by - 2} Q${bx} ${by - 8} ${bx + 32} ${by - 2}"/>
            <path d="M${bx - 30} ${by + 12} Q${bx} ${by + 6} ${bx + 30} ${by + 12}"/>
            <path d="M${bx - 24} ${by + 25} Q${bx} ${by + 20} ${bx + 24} ${by + 25}"/>
          </g>
          ${tilstand.roentgenTrin >= 1 && tilstand.slugt
            ? `<text x="${mx}" y="${my + 12}" text-anchor="middle" font-size="36">${tilstand.slugt.ikon}</text>`
            : `<text x="${bx}" y="${by + 8}" text-anchor="middle" font-size="24">💗</text>`}
        </g>
        <circle cx="${rx}" cy="${ry}" r="48" fill="none" stroke="#6fe3ff" stroke-width="4.5"/>
        <circle cx="${rx}" cy="${ry}" r="52" fill="none" stroke="rgba(111,227,255,.35)" stroke-width="3"/>`;
    }

    // 6. Blid mål-ring KUN når hjælp er aktiveret (så 3,5-5-årige selv får lov at lede først!)
    if (tilstand.visMaal && tilstand.aktivOpgave) {
      const ak = tilstand.aktivOpgave;
      const p = ak === "splint" ? a.skramme
        : ak === "feber" ? a.pande
        : ak === "snue" ? a.naese
        : ak === "roentgen" ? a.mave
        : a.bryst;
      over += `<circle class="dl-maal ${ak}" cx="${p[0]}" cy="${p[1]}" r="${ak === "hjerte" || ak === "roentgen" ? 34 : 26}"/>`;
    }

    return over;
  }

  /* ---------- Gemte "Raske venner" ---------- */
  function hentGem() {
    try {
      const d = JSON.parse(localStorage.getItem(GEM));
      if (d && typeof d.antal === "number" && d.dyr) return d;
    } catch (e) {}
    return { antal: 0, dyr: {} };
  }
  function gemData(d) {
    if (dybTest) return;
    try { localStorage.setItem(GEM, JSON.stringify(d)); } catch (e) {}
  }

  /* ---------- Web Audio-lyde ---------- */
  function lydHjerte() {
    try {
      const c = Spil.audio(), t = c.currentTime;
      [0, 0.16].forEach((off, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(i === 0 ? 110 : 88, t + off);
        o.frequency.exponentialRampToValueAtTime(52, t + off + 0.12);
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.32, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.14);
        o.connect(g).connect(c.destination);
        o.start(t + off); o.stop(t + off + 0.16);
      });
    } catch (e) {}
  }
  function lydSvup() { Spil.tone([320, 520, 880], 0.06, "sine"); }
  function lydKoel() { Spil.tone([660, 880], 0.06, "sine"); }
  function lydToer() { Spil.tone([420, 560], 0.05, "triangle"); }
  function lydPlaster() { Spil.tone([440, 660, 880], 0.07, "sine"); }
  function lydKnas() { Spil.tone([260, 390, 290, 440], 0.06, "triangle"); }

  /* ---------- Spillets tilstand ---------- */
  let root, alive, timers, raf, dybTest = false;
  let gem, patientNr, dyr, opgaver, tilstand, valgtTool, valgtPlaster, fejre, venterGodbid;
  let pointerAktiv = false, pointerId = null, sidstStrog = 0, hjerteTid = 0, sidstHjerteLyd = 0;
  let hintTimer = null, sidstForkertLyd = 0, roentgenPos = null;
  let ventePatienter = [];

  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const $ = s => root.querySelector(s);

  function aktivOpgave() {
    const u = opgaver.find(o => !o.klar);
    return u ? u.type : null;
  }

  function rigtigtRedskabFor(opgType) {
    if (opgType === "splint") return tilstand.splintTrin === 1 ? "pincet" : "plaster";
    if (opgType === "roentgen") return tilstand.roentgenTrin === 1 ? "roentgen" : "pincet";
    if (opgType === "feber") return "klud";
    if (opgType === "snue") return "papir";
    return "stetoskop";
  }

  function partikel(x, y, tegn, n = 4) {
    if (roligt()) return;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "dl-part";
      el.textContent = tegn;
      el.style.left = x + "px";
      el.style.top = y + "px";
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const dist = 36 + Math.random() * 44;
      el.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
      el.style.setProperty("--dy", Math.round(Math.sin(ang) * dist) + "px");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  function tegnPatient() {
    const sc = $(".dl-scene");
    if (!sc) return;
    tilstand.aktivOpgave = aktivOpgave();
    sc.classList.toggle("av", !fejre);
    const img = sc.querySelector(".dl-dyr-img");
    if (img.dataset.dyr !== dyr.id) {
      img.src = `billeder/dyrlaegen/${dyr.id}.webp`;
      img.alt = dyr.navn;
      img.dataset.dyr = dyr.id;
    }
    $(".dl-over").innerHTML = tegnOverlay(dyr, tilstand);

    // Termometer ved feber
    const tEl = $(".dl-termo");
    if (tilstand.feber > 0) {
      tEl.hidden = false;
      const pct = Math.round(28 + tilstand.feber * 68);
      const farve = tilstand.feber > 0.5 ? "#ff5c5c" : tilstand.feber > 0.2 ? "#ffae42" : "#5cc46b";
      $(".dl-termo-bar").style.height = pct + "%";
      $(".dl-termo-bar").style.background = farve;
      $(".dl-termo-kugle").style.background = farve;
    } else {
      tEl.hidden = true;
    }

    // Opgave-bobler øverst
    const ob = $(".dl-opgaver");
    const aType = aktivOpgave();
    ob.innerHTML = opgaver.map(o => {
      const ikon = o.type === "roentgen" && tilstand.roentgenTrin === 2 && tilstand.slugt
        ? tilstand.slugt.ikon
        : OPGAVE_INFO[o.type].ikon;
      const cls = o.klar ? "klar" : (o.type === aType ? "aktiv" : "");
      return `<div class="dl-opg ${cls}">${ikon}</div>`;
    }).join("");
  }

  function opdaterBakke() {
    const bakke = $(".dl-bakke");
    bakke.hidden = venterGodbid;
    root.querySelectorAll(".dl-tool").forEach(b => {
      b.classList.toggle("valgt", b.dataset.tool === valgtTool);
      b.classList.remove("hint");
    });
    const fv = $(".dl-farver");
    fv.hidden = valgtTool !== "plaster" || fejre || venterGodbid;
    root.querySelectorAll(".dl-farve").forEach(b => {
      b.classList.toggle("valgt", b.dataset.plaster === valgtPlaster.id);
    });
  }

  function startHintTimer() {
    clearTimeout(hintTimer);
    if (!alive || fejre) return;
    hintTimer = setTimeout(() => {
      if (!alive || fejre) return;
      const a = aktivOpgave();
      if (!a) return;
      // Vis den blide hjælpering + vink på det rigtige redskab efter 6,5 sek
      tilstand.visMaal = true;
      tegnPatient();
      const redId = rigtigtRedskabFor(a);
      const knap = root.querySelector(`.dl-tool[data-tool="${redId}"]`);
      if (knap && valgtTool !== redId) knap.classList.add("hint");
    }, 6500);
  }

  /* ---------- Venteværelse (vælg mellem 3 dyr) ---------- */
  function bygOpgaverFor(tvunget) {
    if (tvunget && OPGAVE_INFO[tvunget]) return [tvunget];
    const typer = ["roentgen", "splint", "feber", "snue", "hjerte"];
    const blandet = Spil.shuffle(typer);
    const antal = patientNr === 0 ? 1 : (Math.random() < 0.6 ? 2 : 1);
    return blandet.slice(0, antal);
  }

  function visVentevaerelse(foersteGang) {
    fejre = false;
    venterGodbid = false;
    roentgenPos = null;
    clearTimeout(hintTimer);
    $(".dl-naeste").hidden = true;
    $(".dl-godbakke").hidden = true;
    $(".dl-hjerte-bar").hidden = true;
    $(".dl-termo").hidden = true;
    $(".dl-farver").hidden = true;

    const tre = Spil.shuffle(DYR.slice()).slice(0, 3);
    ventePatienter = tre.map(d => ({ dyr: d, opgaver: bygOpgaverFor() }));

    const v = $(".dl-vente");
    v.hidden = false;
    $(".dl-vente-baenk").innerHTML = ventePatienter.map((p, i) => {
      const ikoner = p.opgaver.map(t => OPGAVE_INFO[t].ikon).join("");
      return `<button class="dl-patient-kort" data-idx="${i}" aria-label="${p.dyr.navn}">
        <div class="dl-patient-boble">${ikoner}</div>
        <img src="billeder/dyrlaegen/${p.dyr.id}.webp" alt="${p.dyr.navn}">
      </button>`;
    }).join("");

    if (foersteGang) {
      later(() => Spil.say("Velkommen til dyrlægen! Kan du hjælpe dyrene med at blive raske?", () => {
        if (!alive || $(".dl-vente").hidden) return;
        Spil.say("Hvem vil du hjælpe først? Tryk på et dyr i venteværelset!", null, "dyrl-ventev");
      }, "dyrl-hej"), 260);
    } else {
      later(() => Spil.say("Hvem vil du hjælpe først? Tryk på et dyr i venteværelset!", null, "dyrl-ventev"), 220);
    }
  }

  function startPatient(valgtDyr, valgteTyper) {
    $(".dl-vente").hidden = true;
    fejre = false;
    venterGodbid = false;
    roentgenPos = null;
    patientNr++;
    dyr = valgtDyr || DYR[Math.random() * DYR.length | 0];
    hjerteTid = 0;
    $(".dl-naeste").hidden = true;
    $(".dl-godbakke").hidden = true;
    $(".dl-hjerte-bar").hidden = true;

    const ty = valgteTyper && valgteTyper.length ? valgteTyper : bygOpgaverFor();
    opgaver = ty.map(t => ({ type: t, klar: false }));
    tilstand = {
      splintTrin: ty.includes("splint") ? 1 : 0, // 1 = splint i, 2 = mangler plaster, 0 = klar
      plaster: null,
      roentgenTrin: ty.includes("roentgen") ? 1 : 0, // 1 = skal scannes, 2 = fundet (pincet), 0 = klar
      slugt: ty.includes("roentgen") ? SLUGT[Math.random() * SLUGT.length | 0] : null,
      feber: ty.includes("feber") ? 1 : 0,
      snue: ty.includes("snue") ? 1 : 0,
      visMaal: false,
      aktivOpgave: ty[0]
    };

    valgtTool = null;
    opdaterBakke();

    const sc = $(".dl-scene");
    sc.classList.remove("glad", "ud", "nys", "gumle");
    sc.classList.add("ind");
    tegnPatient();
    requestAnimationFrame(() => {
      if (!alive) return;
      requestAnimationFrame(() => {
        if (!alive) return;
        sc.classList.remove("ind");
      });
    });

    later(() => {
      if (!alive || fejre) return;
      Spil.say(dyr.kommer, () => {
        if (!alive || fejre) return;
        const a = aktivOpgave();
        if (a) Spil.say(OPGAVE_INFO[a].startTekst, null, OPGAVE_INFO[a].startKey);
      }, "dyrl-kommer-" + dyr.id);
    }, 300);

    if (tilstand.snue > 0) {
      later(() => { if (alive && tilstand.snue > 0) $(".dl-scene").classList.add("nys"); }, 850);
    }
    startHintTimer();
  }

  /* ---------- Opgave klaret → Godbid → Fejring ---------- */
  function opgaveKlaret(type, x, y) {
    const o = opgaver.find(item => item.type === type && !item.klar);
    if (!o) return;
    o.klar = true;
    tilstand.visMaal = false;
    roentgenPos = null;
    $(".dl-hjerte-bar").hidden = true;
    Spil.sfx.right();
    Spil.burst(x, y, "⭐✨💚⭐✨💚");

    const info = OPGAVE_INFO[type];
    const naeste = aktivOpgave();

    if (!naeste) {
      // Alle opgaver klaret → nu skal dyret have en godbid!
      fejre = true;
      venterGodbid = true;
      clearTimeout(hintTimer);
      opdaterBakke();
      tegnPatient();

      const andre = Spil.shuffle(GODBIDDER.filter(g => g !== dyr.godbid)).slice(0, 2);
      const tre = Spil.shuffle([dyr.godbid, ...andre]);
      const gb = $(".dl-godbakke");
      gb.innerHTML = tre.map(g => `<button class="dl-godbid" data-g="${g}" aria-label="Godbid">${g}</button>`).join("");
      gb.hidden = false;

      later(() => {
        Spil.say("Hurra! Nu er dyret helt rask igen! Giv det en lækker godbid!", null, [info.okKey, "dyrl-godbid"]);
      }, 180);
    } else {
      tegnPatient();
      const nInfo = OPGAVE_INFO[naeste];
      Spil.say(info.okTekst + " " + nInfo.startTekst, null, [info.okKey, nInfo.startKey]);
      startHintTimer();
    }
  }

  function givGodbid(ikon, el) {
    if (!alive || !venterGodbid) return;
    venterGodbid = false;
    $(".dl-godbakke").hidden = true;
    lydKnas();

    const sc = $(".dl-scene");
    sc.classList.add("gumle");
    Spil.burstAt(sc, ikon + "💚⭐✨❤️");

    gem.antal++;
    gem.dyr[dyr.id] = (gem.dyr[dyr.id] || 0) + 1;
    gemData(gem);
    opdaterTaeller(true);

    later(() => {
      sc.classList.remove("gumle");
      sc.classList.add("glad");
    }, 950);

    Spil.say("Mums, hvor smager det godt! Hør, hvor glad den er!", () => {
      if (!alive) return;
      $(".dl-naeste").hidden = false;
    }, ["dyrl-mums", "dyr-" + dyr.id]);
    later(() => { if (alive && fejre && !venterGodbid) $(".dl-naeste").hidden = false; }, 2200);
  }

  function opdaterTaeller(pop) {
    const b = $(".dl-raske");
    if (!b) return;
    b.innerHTML = `💚 <span>${gem.antal}</span>`;
    if (pop) {
      b.classList.remove("pop");
      void b.offsetWidth;
      b.classList.add("pop");
    }
  }

  /* ---------- Ramme-tjek på dyrets ankerpunkter ---------- */
  function svgKoord(clientX, clientY) {
    const sc = $(".dl-scene");
    if (!sc) return null;
    const r = sc.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: (clientX - r.left) / r.width * 260,
      y: (clientY - r.top) / r.height * 260,
      inde: clientX >= r.left - 18 && clientX <= r.right + 18 && clientY >= r.top - 18 && clientY <= r.bottom + 18
    };
  }

  function vinkRigtigtRedskab() {
    const a = aktivOpgave();
    if (!a) return;
    const redId = rigtigtRedskabFor(a);
    const red = REDSKABER.find(r => r.id === redId);
    const knap = root.querySelector(`.dl-tool[data-tool="${red.id}"]`);
    if (knap) knap.classList.add("hint");
    Spil.say(red.hintTekst, null, red.hintKey);
  }

  function brugRedskab(clientX, clientY, erTryk) {
    if (!alive || fejre) return;
    const pt = svgKoord(clientX, clientY);
    if (!pt || !pt.inde) {
      if (roentgenPos) { roentgenPos = null; tegnPatient(); }
      return;
    }

    const nu = Date.now();
    if (!valgtTool) {
      if (erTryk && nu - sidstForkertLyd > 1400) {
        sidstForkertLyd = nu;
        Spil.sfx.pop();
        partikel(clientX, clientY, "💚", 3);
        vinkRigtigtRedskab();
      }
      return;
    }

    const a = dyr.anker;
    const dist = p => Math.hypot(pt.x - p[0], pt.y - p[1]);

    // 1. RØNTGEN-SCANNER: kør hen over dyret for at se indeni!
    if (valgtTool === "roentgen") {
      roentgenPos = { x: pt.x, y: pt.y };
      tegnPatient();
      if (tilstand.roentgenTrin === 1 && dist(a.mave) < 58) {
        // Fundet den skøre ting i maven!
        tilstand.roentgenTrin = 2;
        tilstand.visMaal = false;
        roentgenPos = null;
        Spil.sfx.right();
        partikel(clientX, clientY, tilstand.slugt.ikon, 4);
        tegnPatient();
        Spil.say(OPGAVE_INFO.roentgen.trin2Tekst, null, OPGAVE_INFO.roentgen.trin2Key);
        startHintTimer();
      }
      return;
    }

    // 2. PINCET: træk splint ud af poten ELLER træk slugt ting op af maven!
    if (valgtTool === "pincet") {
      if (tilstand.splintTrin === 1 && dist(a.skramme) < 64) {
        tilstand.splintTrin = 2;
        tilstand.visMaal = false;
        lydSvup();
        partikel(clientX, clientY, "✨", 4);
        tegnPatient();
        Spil.say(OPGAVE_INFO.splint.trin2Tekst, null, OPGAVE_INFO.splint.trin2Key);
        startHintTimer();
        return;
      }
      if (tilstand.roentgenTrin === 2 && dist(a.mave) < 68) {
        const ting = tilstand.slugt ? tilstand.slugt.ikon : "✨";
        tilstand.roentgenTrin = 0;
        lydSvup();
        partikel(clientX, clientY, ting, 5);
        tegnPatient();
        opgaveKlaret("roentgen", clientX, clientY);
        return;
      }
    }

    // 3. PLASTER: sæt på skrammen (når splinten er trukket ud)
    if (valgtTool === "plaster") {
      if (tilstand.splintTrin === 2 && dist(a.skramme) < 68) {
        tilstand.splintTrin = 0;
        tilstand.plaster = valgtPlaster;
        lydPlaster();
        tegnPatient();
        opgaveKlaret("splint", clientX, clientY);
        return;
      }
      if (tilstand.splintTrin === 1 && dist(a.skramme) < 68 && erTryk && nu - sidstForkertLyd > 1600) {
        sidstForkertLyd = nu;
        Spil.sfx.wrong();
        vinkRigtigtRedskab();
        return;
      }
    }

    // 4. STETOSKOP: virker altid på brystet (sjovt at lytte selv uden hjerte-opgave!)
    if (valgtTool === "stetoskop") {
      if (dist(a.bryst) < 72) {
        const harOpg = opgaver.some(o => o.type === "hjerte" && !o.klar);
        if (nu - sidstHjerteLyd > 560) {
          sidstHjerteLyd = nu;
          lydHjerte();
          partikel(clientX, clientY, "💗", 2);
          if (harOpg) {
            hjerteTid += 0.34;
            const bar = $(".dl-hjerte-bar");
            bar.hidden = false;
            $(".dl-hp i").style.width = Math.min(100, Math.round(hjerteTid * 100)) + "%";
            if (hjerteTid >= 1) opgaveKlaret("hjerte", clientX, clientY);
          } else if (erTryk && nu - sidstForkertLyd > 2200) {
            sidstForkertLyd = nu;
            vinkRigtigtRedskab();
          }
        }
        return;
      }
    }

    // 5. ISTERNING: stryg/tryk på panden
    if (valgtTool === "klud") {
      if (tilstand.feber > 0 && dist(a.pande) < 76) {
        if (nu - sidstStrog < 160 && !erTryk) return;
        sidstStrog = nu;
        tilstand.feber = Math.max(0, tilstand.feber - (erTryk ? 0.34 : 0.2));
        lydKoel();
        partikel(clientX, clientY, "❄️", 3);
        tegnPatient();
        if (tilstand.feber <= 0.01) {
          tilstand.feber = 0;
          tegnPatient();
          opgaveKlaret("feber", clientX, clientY);
        }
        return;
      }
    }

    // 6. LOMMETØRKLÆDE: tør næsen
    if (valgtTool === "papir") {
      if (tilstand.snue > 0 && dist(a.naese) < 74) {
        if (nu - sidstStrog < 160 && !erTryk) return;
        sidstStrog = nu;
        tilstand.snue = Math.max(0, tilstand.snue - (erTryk ? 0.35 : 0.22));
        lydToer();
        partikel(clientX, clientY, "✨", 3);
        tegnPatient();
        if (tilstand.snue <= 0.01) {
          tilstand.snue = 0;
          tegnPatient();
          opgaveKlaret("snue", clientX, clientY);
        }
        return;
      }
    }

    // Blid reaktion ved andet redskab (ingen straf)
    if (erTryk && nu - sidstForkertLyd > 1700) {
      sidstForkertLyd = nu;
      Spil.sfx.pop();
      const tegn = valgtTool === "klud" ? "💧" : valgtTool === "papir" ? "💨" : valgtTool === "plaster" ? "🩹" : "✨";
      partikel(clientX, clientY, tegn, 2);
      const aktiv = aktivOpgave();
      if (aktiv && rigtigtRedskabFor(aktiv) !== valgtTool) vinkRigtigtRedskab();
    }
  }

  /* ---------- Flyvende markør og pointer-håndtering ---------- */
  function visMarkoer(x, y) {
    const m = $(".dl-markoer");
    if (!m || !valgtTool) return;
    const r = REDSKABER.find(t => t.id === valgtTool);
    m.textContent = r.ikon;
    m.style.left = x + "px";
    m.style.top = y + "px";
    m.hidden = false;
  }
  function skjulMarkoer() {
    const m = $(".dl-markoer");
    if (m) m.hidden = true;
  }

  function onPointerDown(e) {
    if (!alive || fejre || !$(".dl-vente").hidden) return;
    if (e.target.closest(".dl-gal,.dl-raske,.dl-naeste,.dl-farve,.dl-godbakke")) return;

    const tb = e.target.closest(".dl-tool");
    if (tb) {
      valgtTool = tb.dataset.tool;
      roentgenPos = null;
      Spil.sfx.click();
      opdaterBakke();
      tegnPatient();
      startHintTimer();
      pointerAktiv = true;
      pointerId = e.pointerId;
      visMarkoer(e.clientX, e.clientY);
      return;
    }

    pointerAktiv = true;
    pointerId = e.pointerId;
    if (valgtTool) visMarkoer(e.clientX, e.clientY);
    brugRedskab(e.clientX, e.clientY, true);
  }

  function onPointerMove(e) {
    if (!alive || !pointerAktiv || e.pointerId !== pointerId) return;
    if (valgtTool) visMarkoer(e.clientX, e.clientY);
    brugRedskab(e.clientX, e.clientY, false);
  }

  function onPointerUp(e) {
    if (e.pointerId !== pointerId) return;
    pointerAktiv = false;
    pointerId = null;
    skjulMarkoer();
    if (roentgenPos) { roentgenPos = null; tegnPatient(); }
  }

  /* ---------- Raske venner-galleri ---------- */
  function aabnGalleri() {
    Spil.sfx.click();
    const g = $(".dl-gal");
    g.hidden = false;
    $(".dl-gal-grid").innerHTML = DYR.map(d => {
      const n = gem.dyr[d.id] || 0;
      return `<button class="dl-gal-kort${n ? "" : " uproevet"}" data-dyr="${d.id}" aria-label="${d.navn}">
        <img src="billeder/dyrlaegen/${d.id}.webp" alt="${d.navn}"><small>${n ? "💚 " + n : "—"}</small></button>`;
    }).join("");
    Spil.say("Her er alle de dyr, du har hjulpet!", null, "dyrl-raske-liste");
  }

  function lukGalleri() {
    Spil.sfx.click();
    $(".dl-gal").hidden = true;
  }

  /* ---------- Registrering ---------- */
  Spil.register({
    id: "dyrlaegen",
    navn: "Dyrlægen",
    ikon: "🩺",
    farve: "#c8f0e4",
    start(r) {
      alive = true;
      timers = [];
      dybTest = !!Spil.dyb;
      gem = hentGem();
      patientNr = 0;
      valgtTool = null;
      valgtPlaster = PLASTRE[0];
      fejre = false;
      venterGodbid = false;
      roentgenPos = null;

      Spil.preload([
        "dyrl-hej", "dyrl-ventev", "dyrl-splint", "dyrl-splint-ud",
        "dyrl-roentgen", "dyrl-roentgen-fundet", "dyrl-roentgen-ud",
        "dyrl-feber", "dyrl-snue", "dyrl-hjerte",
        "dyrl-plaster-ok", "dyrl-feber-ok", "dyrl-snue-ok", "dyrl-hjerte-ok",
        "dyrl-godbid", "dyrl-mums", "dyrl-raske-liste",
        "dyrl-hint-stetoskop", "dyrl-hint-plaster", "dyrl-hint-klud",
        "dyrl-hint-papir", "dyrl-hint-pincet", "dyrl-hint-roentgen",
        ...DYR.map(d => "dyrl-kommer-" + d.id),
        ...DYR.map(d => "dyr-" + d.id),
        ...PLASTRE.map(p => "farve-" + p.id)
      ]);

      r.innerHTML = `<div class="dl">
        <div class="dl-vindue" aria-hidden="true"></div>
        <div class="dl-kors" aria-hidden="true"></div>
        <div class="dl-opgaver" aria-hidden="true"></div>
        <button class="dl-raske" aria-label="Raske venner">💚 <span>${gem.antal}</span></button>
        <div class="dl-bord" aria-hidden="true"></div>
        <div class="dl-scene">
          <img class="dl-dyr-img" alt="">
          <svg class="dl-over" viewBox="0 0 260 260" aria-hidden="true"></svg>
        </div>
        <div class="dl-termo" hidden aria-hidden="true"><div class="dl-termo-bar"></div><div class="dl-termo-kugle"></div></div>
        <div class="dl-hjerte-bar" hidden aria-hidden="true">💗<div class="dl-hp"><i></i></div></div>
        <div class="dl-farver" hidden>${PLASTRE.map(p =>
          `<button class="dl-farve" data-plaster="${p.id}" style="background:${p.bg}" aria-label="${p.id}">${p.pynt}</button>`
        ).join("")}</div>
        <div class="dl-bakke">${REDSKABER.map(t =>
          `<button class="dl-tool" data-tool="${t.id}" style="background:${t.farve}" aria-label="${t.navn}">${t.ikon}</button>`
        ).join("")}</div>
        <div class="dl-godbakke" hidden></div>
        <button class="dl-naeste" hidden aria-label="Næste dyr">➡️</button>
        <div class="dl-markoer" hidden aria-hidden="true"></div>
        <div class="dl-vente" hidden>
          <div class="dl-vente-baenk"></div>
        </div>
        <div class="dl-gal" hidden>
          <div class="dl-gal-grid"></div>
          <button class="dl-gal-luk" aria-label="Luk">✕</button>
        </div>
      </div>`;

      root = r.querySelector(".dl");

      // Vælg patient i venteværelset
      $(".dl-vente-baenk").onclick = e => {
        const kort = e.target.closest(".dl-patient-kort");
        if (!kort) return;
        const p = ventePatienter[parseInt(kort.dataset.idx, 10)];
        if (!p) return;
        Spil.sfx.click();
        startPatient(p.dyr, p.opgaver);
      };

      // Vælg plaster-farve
      root.querySelectorAll(".dl-farve").forEach(b => {
        b.onclick = () => {
          valgtPlaster = PLASTRE.find(p => p.id === b.dataset.plaster) || PLASTRE[0];
          Spil.sfx.click();
          opdaterBakke();
          Spil.say(valgtPlaster.id, null, "farve-" + valgtPlaster.id);
        };
      });

      // Giv godbid
      $(".dl-godbakke").onclick = e => {
        const b = e.target.closest(".dl-godbid");
        if (!b) return;
        givGodbid(b.dataset.g, b);
      };

      // Tilbage til venteværelset
      $(".dl-naeste").onclick = () => {
        if (!alive) return;
        Spil.sfx.click();
        $(".dl-naeste").hidden = true;
        $(".dl-scene").classList.add("ud");
        later(() => visVentevaerelse(false), 320);
      };

      // Raske venner-galleri
      $(".dl-raske").onclick = aabnGalleri;
      $(".dl-gal-luk").onclick = lukGalleri;
      $(".dl-gal-grid").onclick = e => {
        const k = e.target.closest(".dl-gal-kort");
        if (!k) return;
        const d = DYR.find(x => x.id === k.dataset.dyr);
        if (!d) return;
        Spil.burstAt(k, "💚⭐✨");
        Spil.say(d.navn, null, Spil.jaDyr(d.id));
      };

      root.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      // Dybe test-links: #dyrlaegen/roentgen, /splint, /feber, /snue, /hjerte, /raske
      if (Spil.dyb === "raske") {
        startPatient(DYR[0], ["splint"]);
        aabnGalleri();
      } else if (OPGAVE_INFO[Spil.dyb]) {
        startPatient(DYR[0], [Spil.dyb]);
      } else {
        visVentevaerelse(true);
      }
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      clearTimeout(hintTimer);
      if (raf) cancelAnimationFrame(raf);
      pointerAktiv = false;
      pointerId = null;
      roentgenPos = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }
  });
})();
