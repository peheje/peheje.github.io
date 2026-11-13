// Spil: Bilvasken — beskidte biler kører ind i vaskehallen, og barnet vasker dem rene med fingeren.
// Barnet vælger selv værktøj i bunden (vand, sæbe eller svamp) og stryger hen over bilen (eller trykker):
// først vand, så sæbe, så svamp. Værktøjet skifter ikke af sig selv. Med det forkerte værktøj sprøjter og
// skummer det stadig (det er sjovt), men pletterne bliver siddende, og stemmen siger, hvad man skal vælge. Hver mudderplet skal
// skrubbes nogle gange, og da bilen er ren, skinner den, chaufføren (et dyr) siger tak, og bilen kører glad væk.
// Der er tre slags vaskeopgaver: hele bilen, hjulene og ruderne. De to første biler er altid hele bilen;
// derefter dukker hjul og ruder op, så det bliver lidt mere teknisk (kun vinduet, kun hjulene).
// Ingen tabe-tilstand og ingen forkert rækkefølge: man må sprøjte og skrubbe, så længe man vil.
// Et tryk tæller også (så de mindste kan være med), og efter lidt tid viser en hånd, hvor man kan trykke.
// Antal vaskede biler gemmes i lk-bilvask.
(function () {
  const FARVER = [
    ["#ff5c5c", "roed"], ["#4d96ff", "blaa"], ["#ffc93c", "gul"],
    ["#5cc46b", "groen"], ["#b57dff", "lilla"], ["#ff9f43", "orange"]
  ];
  // Chaufførerne (kun emoji — bilen er hovedpersonen)
  const DYR = ["🐻", "🐰", "🐱", "🐶", "🐷", "🐸", "🦊", "🐨", "🦁", "🐮", "🐵", "🐔", "🐧", "🐹"];
  // De tre trin: ikon, replik og hvor stor en del af pletterne der skal være klaret, før man går videre
  const TRIN = [
    { ikon: "💧", lyd: "bilvask-vand", vaelg: "bilvask-vaelg-vand", navn: "bilvask-navn-vand", del: .5 },
    { ikon: "🫧", lyd: "bilvask-saebe", vaelg: "bilvask-vaelg-saebe", navn: "bilvask-navn-saebe", del: .5 },
    { ikon: "🧽", lyd: "bilvask-svamp", vaelg: "bilvask-vaelg-svamp", navn: "bilvask-navn-svamp", del: .66 }
  ];
  const KLASSE = ["vaad", "skum", "vaek"];
  const HITS = 3;      // hvor mange gange man skal skrubbe en plet i hvert trin
  const KOOL = 140;    // ms imellem slag på samme plet (så et roligt strøg ikke tæller dobbelt)
  // Bilens krop (viewBox 0 0 220 110), så pletterne kan lægges præcist ovenpå
  const KROP = "M 14 74 C 6 74 2 70 2 62 L 2 56 C 2 50 6 48 12 48 L 60 48 L 76 24 " +
    "C 80 17 87 14 95 14 L 138 14 C 146 14 152 18 156 25 L 172 48 L 198 50 " +
    "C 208 51 214 55 214 62 L 214 68 C 214 72 210 74 204 74 " +
    "L 191 74 A 23 18 0 0 0 145 74 L 79 74 A 23 18 0 0 0 33 74 Z"; // med hjulkasser

  // Vaskeopgaverne: hvor pletterne sidder (procent af bilens kasse), hvor store de er,
  // og hvad stemmen siger før og efter. Pletterne er delt i områder (zoner = grænser på x-aksen):
  // hvert område skal have sin del vasket, før et trin er færdigt — så man ikke kan nøjes med ét hjul.
  const OPGAVER = {
    krop: {
      staerk: 1,
      pletter: [[14, 53], [19, 63], [26, 50], [31, 60], [38, 54], [44, 64],
                [50, 49], [56, 61], [63, 52], [69, 63], [76, 51], [83, 60]],
      zoner: [38, 62],                   // for, midte, bag
      start: "bilvask-vand", slut: "bilvask-ren"
    },
    hjul: {
      staerk: .6,
      pletter: [[22, 69.5], [28.5, 74], [24.5, 77.5], [71, 69.5], [77.5, 74], [73.5, 77.5]],
      zoner: [50],                       // venstre og højre hjul
      start: "bilvask-hjul", slut: "bilvask-hjul-klar"
    },
    ruder: {
      staerk: .62,
      pletter: [[36, 28], [43, 36], [38.5, 39.5], [55, 26], [67, 37], [60, 22.5], [45.5, 15.5]],
      zoner: [50],                       // forreste og bageste rude
      start: "bilvask-ruder", slut: "bilvask-ruder-klar"
    }
  };

  const REPLIKKER = {
    "bilvask-hej": "Hej! Kan du hjælpe med at vaske bilerne? Vælg vandet, og stryg med fingeren hen over bilen!",
    "bilvask-roed": "Se, en rød bil! Den er beskidt.",
    "bilvask-blaa": "Se, en blå bil! Den er beskidt.",
    "bilvask-gul": "Se, en gul bil! Den er beskidt.",
    "bilvask-groen": "Se, en grøn bil! Den er beskidt.",
    "bilvask-lilla": "Se, en lilla bil! Den er beskidt.",
    "bilvask-orange": "Se, en orange bil! Den er beskidt.",
    "bilvask-vand": "Sprøjt vand på bilen!",
    "bilvask-hjul": "Se på hjulene! De er helt beskidte. Sprøjt vand på dem!",
    "bilvask-ruder": "Ruderne er snavsede! Sprøjt vand på dem!",
    "bilvask-saebe": "Nu skal der sæbe på!",
    "bilvask-svamp": "Skur bilen med svampen!",
    "bilvask-godt": "Godt! Bliv bare ved!",
    "bilvask-ren": "Så blev bilen ren og fin!",
    "bilvask-hjul-klar": "Sikke nogle fine hjul! Nu kan bilen køre igen.",
    "bilvask-ruder-klar": "Nu kan man se ud af ruderne! Hvor er det flot.",
    "bilvask-tak": "Tak for hjælpen! Hvor er den blevet fin!",
    // Værktøjsvalget
    "bilvask-vaelg-vand": "Vælg vandet! Tryk på dråben.",
    "bilvask-vaelg-saebe": "Nu skal der sæbe på! Tryk på boblerne.",
    "bilvask-vaelg-svamp": "Nu skal bilen skures! Tryk på svampen.",
    "bilvask-navn-vand": "Vand!",
    "bilvask-navn-saebe": "Sæbe!",
    "bilvask-navn-svamp": "Svamp!"
  };
  const NOEGLER = Object.keys(REPLIKKER);

  Spil.css("css-bilvasken", `
    .bv{position:relative;height:100%;overflow:hidden;touch-action:none;cursor:crosshair;
      --bw:min(84vw,78vh); --vej:26%;
      background:linear-gradient(#9fd8f6 0%,#c8ebfd 46%,#e8f7ff 64%)}
    @media (max-aspect-ratio:1/1){.bv{--bw:min(94vw,52vh);--vej:34%}}

    /* Himmel, sol og skyer */
    .bv-sol{position:absolute;right:7%;top:5%;width:clamp(58px,10vh,120px);aspect-ratio:1;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,#fff7b8 0 38%,#ffd23c 41% 58%,rgba(255,210,60,.26) 60%,rgba(255,210,60,0) 74%);
      animation:bv-glod 3.6s ease-in-out infinite alternate}
    @keyframes bv-glod{to{scale:1.07}}
    .bv-sky{position:absolute;height:clamp(22px,4.2vh,42px);border-radius:99px;background:#fff;opacity:.95;pointer-events:none;
      animation:bv-skyfly 9s ease-in-out infinite alternate}
    .bv-sky::before,.bv-sky::after{content:"";position:absolute;background:#fff;border-radius:50%}
    .bv-sky::before{width:46%;aspect-ratio:1;left:14%;bottom:30%}
    .bv-sky::after{width:34%;aspect-ratio:1;right:16%;bottom:36%}
    .bv-sky.a{width:clamp(80px,14vh,170px);top:15%;left:7%}
    .bv-sky.b{width:clamp(58px,10vh,130px);top:30%;left:63%;animation-delay:-4s;opacity:.88}
    @keyframes bv-skyfly{to{translate:3vw -1.2vh}}

    /* Bakker, græs og asfalt */
    .bv-bakke{position:absolute;left:-16%;right:-16%;bottom:calc(var(--vej) + 8%);height:16%;pointer-events:none;
      border-radius:50% 50% 0 0/100% 100% 0 0;background:linear-gradient(#cbe9b4,#aedb92)}
    .bv-bakke.b{bottom:calc(var(--vej) + 5%);left:-30%;right:-2%;height:12%;background:linear-gradient(#b7e09d,#9bd07d);opacity:.95}
    .bv-jord{position:absolute;left:0;right:0;bottom:var(--vej);height:16%;background:linear-gradient(#a9de88,#8ed070);pointer-events:none}
    .bv-vej{position:absolute;left:0;right:0;bottom:0;height:var(--vej);pointer-events:none;
      background:linear-gradient(#e3e9f0 0%,#c9d2dd 38%,#b9c3cf 100%);border-top:5px solid #f4f8fb}
    .bv-pyt{position:absolute;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle at 42% 38%,#eaf7ff,#b7dcf0 70%,#9ccbe4)}

    /* Vaskehallen: gul bue og to roterende børster */
    .bv-hal{position:absolute;left:50%;bottom:calc(var(--vej) - 2px);translate:-50% 0;z-index:1;pointer-events:none;
      width:min(calc(var(--bw) * 1.16),97vw);height:calc(var(--bw) * .56);
      border:calc(var(--bw) * .032) solid #ffd23c;border-bottom:0;
      border-radius:calc(var(--bw) * .3) calc(var(--bw) * .3) 0 0;
      box-shadow:inset 0 calc(var(--bw) * .012) 0 rgba(255,255,255,.5);
      /* Bagvæg med fliser, så hallen ligner et rum og ikke bare en bue */
      background:
        repeating-linear-gradient(90deg,rgba(31,58,95,.08) 0 2px,transparent 2px calc(var(--bw) * .07)),
        repeating-linear-gradient(0deg,rgba(31,58,95,.08) 0 2px,transparent 2px calc(var(--bw) * .07)),
        linear-gradient(#e6f5fd,#c9e6f6)}
    /* Skilt på taget (teksten er kun pynt) med sæbebobler */
    .bv-hal::before{content:"BILVASK";position:absolute;left:50%;bottom:calc(100% + var(--bw) * .045);translate:-50%;
      padding:.12em .7em;border-radius:.5em;background:var(--coral);color:#fff;white-space:nowrap;
      font:800 calc(var(--bw) * .05)/1.1 var(--display);letter-spacing:.06em;
      box-shadow:0 calc(var(--bw) * .008) 0 rgba(31,58,95,.18),inset 0 0 0 calc(var(--bw) * .006) rgba(255,255,255,.55)}
    /* Rør med dyser hen over loftet */
    .bv-hal::after{content:"";position:absolute;left:18%;right:18%;top:7%;height:calc(var(--bw) * .05);
      background:
        linear-gradient(#b9c9d8,#8ea3b8) top/100% 50% no-repeat,
        repeating-linear-gradient(90deg,transparent 0 calc(var(--bw) * .045),#8ea3b8 calc(var(--bw) * .045) calc(var(--bw) * .06)) bottom/100% 50% no-repeat;
      border-radius:calc(var(--bw) * .012)}
    .bv-boerste{position:absolute;bottom:calc(var(--vej) - 4px);z-index:2;width:calc(var(--bw) * .105);height:calc(var(--bw) * .3);
      border-radius:42% 42% 38% 38% / 14% 14% 10% 10%;pointer-events:none;
      /* Lodrette børstehår på en rulle, der drejer om en lodret aksel: skygge i kanterne, så den ser rund ud */
      background:
        linear-gradient(90deg,rgba(31,58,95,.30),rgba(31,58,95,0) 32%,rgba(255,255,255,.25) 46%,rgba(31,58,95,0) 60%,rgba(31,58,95,.32)),
        repeating-linear-gradient(90deg,#5fb3e6 0 6px,#9ed6f6 6px 12px,#e4f5ff 12px 18px);
      box-shadow:inset 0 -5px 0 rgba(31,58,95,.12)}
    /* Akslen, som rullen hænger i */
    .bv-boerste::before{content:"";position:absolute;left:50%;bottom:100%;translate:-50%;width:18%;height:calc(var(--bw) * .17);
      border-radius:4px 4px 0 0;background:linear-gradient(90deg,#8ea3b8,#c7d4e0,#8ea3b8)}
    .bv-boerste.v{left:calc(50% - var(--bw) * .56)}
    .bv-boerste.h{left:calc(50% + var(--bw) * .5075)}
    .bv.washer .bv-boerste{animation:bv-spin .4s linear infinite}
    @keyframes bv-spin{to{background-position:0 0,18px 0}}
    /* På telefonen er der ikke plads til børsterne ved siden af bilen */
    @media (max-aspect-ratio:1/1){.bv-boerste{display:none}}

    /* Spand med sæbebobler på asfalten */
    .bv-spand{position:absolute;left:5%;bottom:2%;width:clamp(42px,8.4vh,78px);aspect-ratio:1;pointer-events:none;z-index:2}
    .bv-spand svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 3px 2px rgba(31,58,95,.18))}
    /* På telefonen sidder trin-bjælken i bunden, så spanden flyttes op over den */
    @media (max-aspect-ratio:1/1){.bv-spand{bottom:calc(14% + 4vh)}}

    /* Bilen */
    .bv-bil{position:absolute;left:50%;bottom:calc(var(--vej) - var(--bw) * .06);width:var(--bw);aspect-ratio:2/1;z-index:3;
      transform:translateX(-50%);transition:transform 1.4s cubic-bezier(.4,0,.3,1);touch-action:none}
    /* Hvert hjul drejer om sit eget nav, med uret, fordi bilen kører mod højre */
    .bv-bil.koerer .bv-hjul{animation:bv-rul .45s linear infinite}
    @keyframes bv-rul{to{rotate:360deg}}
    .bv-indre{position:relative;width:100%;height:100%;--c:#ff5c5c}
    .bv-svg{display:block;width:100%;height:100%;overflow:visible;pointer-events:none;
      filter:drop-shadow(0 7px 6px rgba(31,58,95,.20));transition:filter .5s}
    .bv-indre.vaad .bv-svg{filter:drop-shadow(0 7px 6px rgba(31,58,95,.20)) brightness(.96) saturate(1.06)}
    .bv-indre.ren .bv-svg{filter:drop-shadow(0 7px 10px rgba(31,58,95,.24)) brightness(1.06) saturate(1.12)}
    .bv-bil.fin .bv-indre{animation:bv-hop .85s cubic-bezier(.32,1.5,.5,1)}
    @keyframes bv-hop{30%{translate:0 -12%}55%{translate:0 0}72%{translate:0 -5%}}
    .bv-hjul{transform-box:fill-box;transform-origin:center}
    .bv-pletter{position:absolute;inset:0;pointer-events:none}
    /* Chaufføren sidder inde i bilen: kun det, der ses gennem forruden, vises (samme form som ruden) */
    .bv-kabine{position:absolute;left:51.4%;top:20.9%;width:18.6%;height:20%;pointer-events:none;
      clip-path:polygon(0 0,48.8% 0,62% 4%,70.7% 22.7%,100% 100%,0 100%)}
    .bv-chauffoer{position:absolute;left:46%;top:66%;translate:-50% -50%;font-size:calc(var(--bw) * .09);
      line-height:1;pointer-events:none;transition:translate .3s}
    /* Rattet foran chaufføren, set fra siden */
    .bv-kabine::after{content:"";position:absolute;left:66%;top:52%;width:9%;height:58%;border-radius:50%;
      border:max(2px,calc(var(--bw) * .007)) solid #2f3542;rotate:-24deg}
    .bv-chauffoer.glad{translate:-50% -60%;animation:bv-vink .55s ease-in-out infinite alternate}
    @keyframes bv-vink{to{rotate:14deg}}

    /* Snavs: ruderne bliver grå, og hjulene får en mudderring */
    .bv-rude{fill:#dff0fb;transition:fill .45s}
    .bv-indre.job-ruder .bv-rude{fill:#c6cdc3}
    .bv-indre.job-ruder.ren .bv-rude{fill:#dff0fb}
    .bv-mudder{fill:none;stroke:#8b5e33;stroke-width:0;stroke-dasharray:8 10;stroke-linecap:round;transition:stroke-width .45s}
    .bv-indre.job-hjul .bv-mudder{stroke-width:5}
    .bv-indre.job-hjul.ren .bv-mudder{stroke-width:0}
    /* Snavs på hjul og ruder ser ikke ens ud: mudder på dækkene, en grå hinde på glasset.
       :not(.skum) og :not(.vaek) gør, at sæbeskummet og de rene pletter stadig ser ud som de skal */
    .bv-pletter.job-hjul .bv-plat:not(.skum):not(.vaek){background:#a97a45}
    .bv-pletter.job-ruder .bv-plat:not(.skum):not(.vaek){background:#9aa79c;box-shadow:none}

    /* Mudderplet: bliver våd, får sæbe og forsvinder */
    .bv-plat{position:absolute;left:var(--x);top:var(--y);width:calc(var(--bw) * .062 * var(--f));aspect-ratio:1;
      translate:-50% -50%;rotate:var(--r);pointer-events:none;background:#8b5e33;
      border-radius:48% 52% 55% 45% / 54% 46% 54% 46%;
      box-shadow:inset -2px -3px 0 rgba(80,52,20,.22),0 1px 2px rgba(80,52,20,.18);
      transition:scale .28s cubic-bezier(.3,1.5,.5,1),opacity .28s,background .22s,filter .22s,box-shadow .22s}
    .bv-plat::before,.bv-plat::after{content:"";position:absolute;border-radius:50%;background:inherit}
    .bv-plat::before{width:38%;aspect-ratio:1;left:-17%;top:26%}
    .bv-plat::after{width:30%;aspect-ratio:1;right:-15%;bottom:10%}
    .bv-plat.halv{scale:.82;opacity:.94}
    .bv-plat.halv2{scale:.64;opacity:.85}
    .bv-plat.vaad{filter:brightness(.7) saturate(.8)}
    .bv-plat.skum{background:radial-gradient(circle at 32% 28%,#fff 0 38%,#eef8ff 66%,#d2eaf8 100%);
      filter:none;scale:1.14;box-shadow:inset -4px -5px 0 rgba(150,200,225,.5),0 2px 5px rgba(31,58,95,.12)}
    .bv-plat.vaek{scale:0;opacity:0}
    .bv-plat.peg{animation:bv-peg 1s ease-in-out infinite}
    @keyframes bv-peg{50%{scale:1.2}}

    /* Værktøjerne forneden: vand, sæbe, svamp. Barnet vælger selv. */
    .bv-trins{position:absolute;left:50%;bottom:max(10px,env(safe-area-inset-bottom,0px));translate:-50%;z-index:6;
      display:flex;align-items:center;gap:clamp(10px,2.2vh,22px);border-radius:999px;padding:clamp(6px,1vh,10px) clamp(10px,1.8vh,18px);
      background:rgba(255,255,255,.82);box-shadow:0 6px 0 rgba(31,58,95,.12)}
    .bv-trin{position:relative;width:clamp(64px,11vh,104px);aspect-ratio:1;display:grid;place-items:center;border-radius:50%;
      font:inherit;font-size:clamp(34px,6vh,58px);line-height:1;padding:0;border:0;cursor:pointer;touch-action:manipulation;
      background:#eef6fc;box-shadow:0 5px 0 rgba(31,58,95,.18);
      transition:scale .2s,background .2s,box-shadow .2s,translate .1s}
    .bv-trin:active{translate:0 3px;box-shadow:0 2px 0 rgba(31,58,95,.18)}
    .bv-trin.valgt{background:var(--sun);box-shadow:0 5px 0 #d9a21a,0 0 0 4px #fff;scale:1.12}
    .bv-trin.klar::after{content:"✓";position:absolute;right:-.15em;bottom:-.15em;width:1.25em;height:1.25em;display:grid;place-items:center;
      border-radius:50%;background:#fff;color:#3d8f4d;font-weight:800;font-size:.42em;box-shadow:0 2px 0 rgba(31,58,95,.14)}
    .bv-trin.vis{animation:bv-vis .8s ease-in-out 4}
    @keyframes bv-vis{50%{scale:1.28;box-shadow:0 5px 0 rgba(31,58,95,.18),0 0 0 8px rgba(255,210,60,.75)}}
    .bv-taeller{position:absolute;left:50%;top:calc(2vh + env(safe-area-inset-top,0px));translate:-50%;z-index:5;
      display:flex;align-items:center;gap:.3em;border-radius:999px;padding:.12em .75em;background:var(--card);
      font-weight:800;font-size:clamp(20px,4vh,34px);box-shadow:0 5px 0 rgba(31,58,95,.15);pointer-events:none}
    .bv-taeller b{font-variant-numeric:tabular-nums}

    /* Fingerens værktøj og små partikler */
    .bv-hand{position:fixed;left:0;top:0;translate:-50% -115%;font-size:clamp(34px,6.4vh,62px);line-height:1;
      pointer-events:none;z-index:9;opacity:0;scale:.6;transition:opacity .15s,scale .15s}
    .bv-hand.syn{opacity:1;scale:1}
    .bv-hand.hint{animation:bv-vift 1s ease-in-out infinite}
    @keyframes bv-vift{50%{scale:1.16;rotate:10deg}}
    .bv-lag{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:8}
    /* Vandstråle fra fingeren (kun mens man sprøjter) */
    .bv-straal{position:fixed;left:0;top:0;width:0;height:0;z-index:7;pointer-events:none;opacity:0;transition:opacity .15s}
    .bv-straal.syn{opacity:1}
    .bv-straal::before{content:"";position:absolute;left:4px;top:-19px;width:clamp(96px,17vh,190px);height:clamp(26px,4.8vh,46px);
      clip-path:polygon(0 46%,100% 2%,100% 98%,0 54%);
      background:radial-gradient(ellipse at 0 50%,rgba(255,255,255,.98) 0 18%,rgba(205,242,255,.9) 42%,rgba(160,220,250,.5) 70%,rgba(160,220,250,0) 92%);
      mix-blend-mode:screen;
      animation:bv-straal-puls .16s ease-in-out infinite alternate}
    @keyframes bv-straal-puls{to{scale:.92 1.14}}
    /* Plask, våde mærker og sæbeskum, der bliver siddende på bilen */
    .bv-ring{position:absolute;width:34px;height:15px;border-radius:50%;border:3px solid #c4ecff;
      translate:-50% -50%;animation:bv-ring .5s ease-out forwards;pointer-events:none}
    @keyframes bv-ring{from{scale:.3;opacity:.95}to{scale:1.9;opacity:0}}
    .bv-vandlag,.bv-sudlag{position:absolute;inset:0;pointer-events:none;transition:opacity .4s}
    .bv-vandlag.tor,.bv-sudlag.tor{opacity:0}
    .bv-vandlag i{position:absolute;aspect-ratio:1.5;border-radius:50%;translate:-50% -50%;
      background:radial-gradient(ellipse at 45% 40%,rgba(255,255,255,.3) 0 26%,rgba(150,214,250,.24) 60%,rgba(150,214,250,0) 88%);
      animation:bv-ind .25s ease-out}
    .bv-sudlag i{position:absolute;aspect-ratio:1;border-radius:50%;translate:-50% -50%;
      background:radial-gradient(circle at 32% 28%,#fff 0 34%,#eef8ff 68%,#d8ecf8 100%);
      box-shadow:0 1px 2px rgba(31,58,95,.12);animation:bv-ind .3s cubic-bezier(.3,1.5,.5,1)}
    @keyframes bv-ind{from{scale:.2;opacity:0}}
    .bv-part{position:absolute;border-radius:50%;transform:translate(-50%,-50%);animation:bv-fly .7s ease-out forwards}
    .bv-part.drop{background:radial-gradient(circle at 34% 28%,#fff 0 20%,#93d9ff 46%,#3fa2dd 100%)}
    .bv-part.boble{background:radial-gradient(circle at 32% 26%,#fff 0 32%,#eef9ff 62%,#cfe9f7 100%);border:1px solid #fff}
    @keyframes bv-fly{to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.25);opacity:0}}
    @media (prefers-reduced-motion:reduce){
      .bv-sol,.bv-sky,.bv-bil.koerer .bv-hjul,.bv-bil.fin .bv-indre,.bv-plat.peg,.bv-hand.hint,.bv-trin.vis,
      .bv-chauffoer.glad,.bv.washer .bv-boerste,.bv-straal::before{animation:none}
      .bv-bil{transition:none} /* bilen kører ikke ind og ud, den skifter bare */
      .bv-part{animation-duration:.35s}
      .bv-vandlag i,.bv-sudlag i{animation:none}
    }
  `);

  let root, bil, indre, chauffoer, pletterEl, hand, lag, taeller, straal, vandLag, sudLag;
  let alive, timers, dragId, travl, trin, vaerk = -1, forkert = 0, sidstVist = 0, rostet, vasket, hintT, hintSlut, spray, sidstePuf, holdT, peg;
  let sidsteFarve = -1, sidsteDyr = -1;
  // Dybt link til test (Spil.dyb): "<opgave>-<trin>", fx "hjul", "ruder-saebe", "svamp", "ren".
  // Opgave: krop/hjul/ruder. Trin: vand/saebe/svamp/ren. I test-tilstand gemmes intet.
  let dybOpg = "", dybTrin = 0, test = false;
  let opgave = "krop", sidsteOpgave = "", antalPletter = 12, straalVinkel = 0, sidsteRing = 0, fart = 0;
  const later = (fn, ms) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const alle = s => [...root.querySelectorAll(s)];
  const si = k => Spil.say(REPLIKKER[k] || "", null, k);
  // Vent med en ny replik, til stemmen er færdig (højst maks ms), så den forrige ikke bliver klippet af
  function naarStille(fn, maks) {
    const t0 = Date.now();
    const tjek = () => { if (Spil.isTalking() && Date.now() - t0 < maks) later(tjek, 150); else fn(); };
    tjek();
  }

  /* ---------- Gemt antal vaskede biler ---------- */
  function hent() {
    try { vasket = (JSON.parse(localStorage.getItem("lk-bilvask") || "{}").vasket | 0) || 0; }
    catch (e) { vasket = 0; }
  }
  function gem() {
    try { localStorage.setItem("lk-bilvask", JSON.stringify({ vasket })); } catch (e) {}
  }

  /* ---------- Lyd: vand der sprøjter, mens fingeren rører bilen ---------- */
  let stoej = null; // støjbufferen laves kun én gang, så et hurtigt tryk ikke laver 2 s lyd hver gang
  function stoejBuffer(c) {
    if (stoej && stoej.c === c) return stoej.buf;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .6;
    stoej = { c, buf };
    return buf;
  }
  function sprayOn() {
    if (spray) return;
    try {
      const c = Spil.audio();
      const src = c.createBufferSource(); src.buffer = stoejBuffer(c); src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = .8;
      bp.frequency.value = [2300, 900, 480][Math.max(0, vaerk)];
      const g = c.createGain(); g.gain.setValueAtTime(.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(vaerk === 0 ? .085 : .05, c.currentTime + .1);
      src.connect(bp).connect(g).connect(c.destination);
      src.start();
      spray = { src, g, c, bp };
    } catch (e) {}
  }
  function sprayOff() {
    if (!spray) return;
    const { src, g, c } = spray; spray = null;
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setTargetAtTime(.0001, c.currentTime, .05);
      src.stop(c.currentTime + .3);
    } catch (e) {}
  }

  /* ---------- Små partikler: vanddråber og sæbebobler ---------- */
  function puf(x, y, n, slags, ang) {
    if (!lag) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.className = "bv-part " + slags;
      const s = (slags === "drop" ? 7 : 9) + Math.random() * 9;
      p.style.width = s + "px"; p.style.height = s + "px";
      p.style.left = x + "px"; p.style.top = y + "px";
      // Med en retning flyver dråberne som en stråle; ellers sprøjter de til alle sider
      const a = ang === undefined ? Math.random() * Math.PI * 2 : ang + (Math.random() - .5) * 1.4;
      const d = 22 + Math.random() * 58;
      p.style.setProperty("--dx", Math.cos(a) * d + "px");
      p.style.setProperty("--dy", (Math.sin(a) * d - (ang === undefined ? 42 : 8)) + "px");
      lag.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
  }

  /* ---------- Vandstråle, plask og mærker, der bliver siddende på bilen ---------- */
  // Koordinat i procent af bilens kasse, så mærkerne følger bilen
  function iBilen(x, y) {
    const r = bil.getBoundingClientRect();
    return { x: (x - r.left) / r.width * 100, y: (y - r.top) / r.height * 100 };
  }
  function straale(x, y) {
    if (!straal) return;
    straal.style.left = x + "px"; straal.style.top = y + "px";
    straal.style.rotate = straalVinkel + "rad";
    straal.classList.add("syn");
  }
  function straaleVaek() { if (straal) straal.classList.remove("syn"); }
  function ring(x, y) {
    const nu = performance.now();
    if (nu - sidsteRing < 85 || !lag) return;
    sidsteRing = nu;
    const d = document.createElement("i");
    d.className = "bv-ring";
    d.style.left = x + "px"; d.style.top = y + "px";
    lag.appendChild(d);
    setTimeout(() => d.remove(), 520);
  }
  // Våde mærker (trin 0) og sæbeskum (trin 1), der bliver liggende, til trinnet skifter
  function maerke(lagEl, x, y, min, max) {
    if (!lagEl || lagEl.childElementCount > 26) return;
    const p = iBilen(x, y);
    const d = document.createElement("i");
    d.style.left = p.x.toFixed(1) + "%"; d.style.top = p.y.toFixed(1) + "%";
    d.style.width = (min + Math.random() * (max - min)).toFixed(1) + "%";
    lagEl.appendChild(d);
  }
  function rydLag(lagEl) {
    if (!lagEl || !lagEl.childElementCount) return;
    lagEl.classList.add("tor");
    setTimeout(() => {
      if (!lagEl.isConnected) return;
      lagEl.innerHTML = "";
      lagEl.classList.remove("tor");
    }, 420);
  }
  // Et plask, når et trin er færdigt: vandet skyller pletterne af
  function plask() {
    if (!lag || !bil) return;
    const r = bil.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const d = document.createElement("i");
      d.className = "bv-ring";
      d.style.left = (r.left + r.width * (.12 + Math.random() * .76)) + "px";
      d.style.top = (r.top + r.height * (.3 + Math.random() * .5)) + "px";
      lag.appendChild(d);
      setTimeout(() => d.remove(), 560);
    }
    puf(r.left + r.width * .3, r.top + r.height * .5, 8, "drop");
    puf(r.left + r.width * .7, r.top + r.height * .5, 8, "drop");
    Spil.tone([880, 1240, 1560], .05, "sine");
  }

  /* ---------- Pletterne på bilen ---------- */
  function vaelgOpgave() {
    const n = vasket;
    if (n < 2) return "krop";        // de første biler: bare vask hele bilen
    if (n === 2) return "hjul";       // så bliver det lidt mere teknisk
    if (n === 3) return "ruder";
    const valg = ["krop", "krop", "hjul", "ruder"];
    let j, i = 0;
    do { j = valg[(Math.random() * valg.length) | 0]; } while (j === sidsteOpgave && ++i < 8);
    return j;
  }
  function tegnPletter(navn) {
    const o = OPGAVER[navn];
    pletterEl.className = "bv-pletter job-" + navn;
    pletterEl.innerHTML = "";
    antalPletter = o.pletter.length;
    o.pletter.forEach(([x, y]) => {
      const b = document.createElement("i");
      b.className = "bv-plat";
      b.dataset.z = o.zoner.filter(g => x >= g).length;
      b.style.setProperty("--x", (x + (Math.random() * 3 - 1.5)).toFixed(1) + "%");
      b.style.setProperty("--y", (y + (Math.random() * 3 - 1.5)).toFixed(1) + "%");
      b.style.setProperty("--f", ((0.72 + Math.random() * 0.7) * o.staerk).toFixed(2));
      b.style.setProperty("--r", (Math.random() * 64 - 32).toFixed(0) + "deg");
      pletterEl.appendChild(b);
    });
  }
  // Hvor langt er hvert område nået i det nuværende trin? [{klaret, krav}] pr. område
  function omraader() {
    const z = {};
    alle(".bv-plat").forEach(b => {
      const o = z[b.dataset.z] = z[b.dataset.z] || { n: 0, klaret: 0 };
      o.n++; if (b.classList.contains(KLASSE[trin])) o.klaret++;
    });
    return Object.keys(z).map(k => ({ z: k, klaret: z[k].klaret, krav: Math.max(1, Math.ceil(z[k].n * TRIN[trin].del)) }));
  }
  const mangler = () => omraader().filter(o => o.klaret < o.krav);

  function opdaterTrins() {
    alle(".bv-trin").forEach((el, i) => {
      el.classList.toggle("valgt", i === vaerk);
      el.classList.toggle("klar", i < trin);
    });
    hand.textContent = vaerk >= 0 ? TRIN[vaerk].ikon : "👆";
  }
  // Barnet trykker på et værktøj
  function vaelgVaerk(i) {
    if (!alive) return;
    const ny = i !== vaerk;
    vaerk = i; forkert = 0;
    alle(".bv-trin").forEach(el => el.classList.remove("vis"));
    opdaterTrins();
    Spil.sfx.click();
    if (ny && !Spil.isTalking()) si(TRIN[i].navn);
    if (spray) { sprayOff(); if (dragId !== null) sprayOn(); }
    hintOm(9000);
  }
  // Vis (med stemme og en pulserende knap), hvilket værktøj bilen mangler nu
  function visVaerk() {
    if (trin >= TRIN.length) return;
    const nu = Date.now();
    if (nu - sidstVist < 5000) return;
    sidstVist = nu;
    const el = root.querySelector(`.bv-trin[data-i="${trin}"]`);
    if (el) { el.classList.remove("vis"); void el.offsetWidth; el.classList.add("vis"); }
    si(TRIN[trin].vaelg);
  }

  /* ---------- Vask med fingeren ---------- */
  function visPeg(x, y) {
    peg = { x, y };
    hand.style.left = x + "px"; hand.style.top = y + "px";
    hand.classList.add("syn");
  }

  // Et slag på en plet: den bliver først mindre, og efter HITS slag forsvinder den
  function pletRam(b) {
    const nu = performance.now();
    if (nu - (+b.dataset.t || 0) < KOOL) return 0;
    b.dataset.t = nu;
    const h = (+b.dataset.h || 0) + 1;
    b.dataset.h = h;
    b.classList.remove("peg"); // ellers overdøver hint-pulsen, at pletten bliver mindre
    const r = b.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    puf(x, y, (trin === 2 ? 4 : 3) + Math.min(fart / 10 | 0, 3), trin === 0 ? "drop" : "boble", trin === 0 ? straalVinkel : undefined);
    if (trin === 0) { ring(x, y); maerke(vandLag, x, y, 8, 14); }
    else if (trin === 1) maerke(sudLag, x, y, 2.5, 5.5);
    if (h < HITS) {
      b.classList.add(h === 1 ? "halv" : "halv2");
      Spil.tone(trin === 0 ? [360, 250] : trin === 1 ? [560, 830] : [1250, 900], .045, trin === 2 ? "square" : "sine");
      return 1;
    }
    b.classList.remove("halv", "halv2");
    b.classList.add(KLASSE[trin]);
    Spil.tone(trin === 0 ? [330, 205] : trin === 1 ? [700, 980] : [1600, 1000], .05, trin === 2 ? "square" : "sine");
    return 1;
  }

  function rubAt(x, y) {
    if (!alive || travl) return;
    if (vaerk < 0) { visVaerk(); return; }   // intet værktøj valgt endnu
    // Forkert værktøj: det sprøjter og skummer, men pletterne bliver, og stemmen hjælper
    if (vaerk !== trin) {
      const nu = Date.now();
      if (nu - sidstePuf > 110) {
        sidstePuf = nu;
        puf(x, y, 3, vaerk === 0 ? "drop" : "boble", vaerk === 0 ? straalVinkel : undefined);
        if (vaerk === 0) { ring(x, y); maerke(vandLag, x, y, 7, 12); }
        else if (vaerk === 1) maerke(sudLag, x, y, 2, 4.5);
        if (++forkert >= 5) visVaerk();
      }
      return;
    }
    const R = Math.max(26, bil.clientWidth * .085);
    let ramt = 0;
    alle(".bv-plat").forEach(b => {
      if (b.classList.contains(KLASSE[trin])) return;
      const r = b.getBoundingClientRect();
      if (Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < R) ramt += pletRam(b);
    });
    const nu = Date.now();
    if (!ramt && nu - sidstePuf > 110) {
      sidstePuf = nu;
      puf(x, y, 3, trin === 0 ? "drop" : "boble", trin === 0 ? straalVinkel : undefined);
      if (trin === 0) { ring(x, y); maerke(vandLag, x, y, 7, 12); }
      else if (trin === 1) maerke(sudLag, x, y, 2, 4.5);
    }
    if (ramt) hintOm(9000);
    const omr = omraader(), mangel = omr.filter(o => o.klaret < o.krav);
    if (!mangel.length) { naesteTrin(); return; }
    // Er et område færdigt, mens et andet mangler: en plet dér pulserer med det samme,
    // og slipper man, viser hånden hurtigt derhen
    if (ramt && mangel.length < omr.length) { hintOm(1800); pegPaaMangel(mangel); }
    // Lidt ros undervejs, men kun hvis stemmen ikke er i gang med noget vigtigt
    const klaret = omr.reduce((s, o) => s + Math.min(o.klaret, o.krav), 0), ialt = omr.reduce((s, o) => s + o.krav, 0);
    if (!rostet && klaret >= Math.ceil(ialt * .6)) {
      rostet = true;
      if (!Spil.isTalking()) si("bilvask-godt");
    }
  }

  let pegetTrin = -1;
  function pegPaaMangel(mangel) {
    if (pegetTrin === trin) return; // kun én gang pr. trin, så det ikke blinker hele tiden
    pegetTrin = trin;
    const z = new Set(mangel.map(o => o.z));
    const kandidater = alle(".bv-plat:not(." + KLASSE[trin] + ")").filter(b => z.has(b.dataset.z));
    kandidater.slice(0, 2).forEach(b => { b.classList.add("peg"); later(() => b.classList.remove("peg"), 3500); });
  }

  function naesteTrin() {
    travl = true; sprayOff();
    straaleVaek();
    plask();
    alle(".bv-plat").forEach(b => {
      b.classList.remove("halv", "halv2");
      b.dataset.h = 0; b.dataset.t = 0;
      b.classList.add(KLASSE[trin]);
    });
    trin++;
    rostet = false;
    opdaterTrins();
    if (trin >= TRIN.length) { faerdig(); return; }
    if (trin === 1) { indre.classList.add("vaad"); rydLag(vandLag); }  // vandet er skyllet af
    if (trin === 2) rydLag(sudLag);                                     // sæben bliver skyllet af
    Spil.tone([700, 940, 1240], .07, "triangle");
    hand.classList.remove("syn", "hint");
    root.classList.remove("washer");
    forkert = 0; sidstVist = Date.now(); // stemmen siger selv, hvad der skal ske nu
    later(() => {
      travl = false;
      const t = trin;
      naarStille(() => { if (trin === t) si(TRIN[t].lyd); }, 2500); // lad "Godt! Bliv bare ved!" tale færdig
      if (dragId !== null) { // fingeren er stadig på bilen: lyd og hånd kommer tilbage (samme værktøj)
        sprayOn();
        root.classList.add("washer");
        if (peg) visPeg(peg.x, peg.y);
      }
      hintOm(9000);
    }, 850);
  }

  /* ---------- Bilen er ren ---------- */
  // Slip fingeren med magt: bruges når bilen kører væk, så et gammelt tryk ikke
  // pludselig vasker den næste bil (og så hånden og vandlyden forsvinder)
  function slipAlt() {
    dragId = null;
    clearInterval(holdT);
    sprayOff();
    straaleVaek();
    if (root) root.classList.remove("washer");
    if (hand) hand.classList.remove("syn", "hint");
  }

  function faerdig() {
    slipAlt();
    straaleVaek();
    rydLag(vandLag);
    rydLag(sudLag);
    indre.classList.remove("vaad");
    indre.classList.add("ren");
    bil.classList.add("fin");
    chauffoer.classList.add("glad");
    if (!test) { vasket++; gem(); }
    taeller.textContent = vasket;
    Spil.sfx.fanfare();
    Spil.burstAt(bil, "✨⭐✨🌟");
    later(() => Spil.burstAt(bil, "✨💫⭐"), 420);
    later(() => Spil.say(REPLIKKER[OPGAVER[opgave].slut] + " " + REPLIKKER["bilvask-tak"], null,
      [OPGAVER[opgave].slut, "bilvask-tak"]), 800);
    later(koerVak, 3400);
    later(naesteBil, 4900);
  }

  function koerVak() {
    if (!alive) return;
    Spil.tone([300, 380, 470], .09, "sine");
    later(() => { if (alive) Spil.tone([640, 640], .09, "square"); }, 700);
    bil.classList.add("koerer");
    bil.style.transform = "translateX(calc(100vw + 60%))";
    later(() => { if (alive) chauffoer.classList.remove("glad"); }, 1200);
  }

  /* ---------- Næste bil kører ind ---------- */
  function naesteBil(foerste) {
    if (!alive) return;
    slipAlt();
    straaleVaek();
    travl = true; trin = 0; vaerk = -1; forkert = 0; sidstVist = 0; rostet = false; pegetTrin = -1;
    sidsteOpgave = opgave;
    opgave = foerste && dybOpg ? dybOpg : vaelgOpgave();
    const o = OPGAVER[opgave];
    // Ikke samme farve eller chauffør to gange i træk
    let fi, di;
    do fi = (Math.random() * FARVER.length) | 0; while (fi === sidsteFarve);
    do di = (Math.random() * DYR.length) | 0; while (di === sidsteDyr);
    sidsteFarve = fi; sidsteDyr = di;
    const f = FARVER[fi];
    indre.style.setProperty("--c", f[0]);
    chauffoer.textContent = DYR[di];
    bil.className = "bv-bil";
    indre.className = "bv-indre job-" + opgave;
    tegnPletter(opgave);
    rydLag(vandLag);
    rydLag(sudLag);
    opdaterTrins();
    // Kør ind fra venstre (uden overgang det første stykke)
    bil.style.transition = "none";
    bil.style.transform = "translateX(calc(-50vw - 100%))";
    void bil.offsetWidth;
    bil.style.transition = "";
    bil.style.transform = "translateX(-50%)";
    bil.classList.add("koerer");
    later(() => bil.classList.remove("koerer"), 1250);
    later(() => {
      travl = false;
      if (foerste && test) { springTil(dybTrin, f, o); return; }
      if (foerste) si("bilvask-hej");
      else naarStille(() => {     // lad "Tak for hjælpen!" fra den forrige bil tale færdig
        if (indre.style.getPropertyValue("--c") === f[0] && trin === 0)
          Spil.say(REPLIKKER["bilvask-" + f[1]] + " " + REPLIKKER[o.start], null, ["bilvask-" + f[1], o.start]);
      }, 4000);
      hintOm(11000);
    }, 1250);
  }

  // Dybt link: spring direkte til et trin (pletterne fra de tidligere trin er klaret), eller til "ren"
  function springTil(t, f, o) {
    for (let i = 0; i < Math.min(t, TRIN.length); i++) alle(".bv-plat").forEach(b => b.classList.add(KLASSE[i]));
    trin = t;
    if (trin >= TRIN.length) { faerdig(); return; }
    if (trin >= 1) indre.classList.add("vaad");
    vaerk = trin;
    opdaterTrins();
    if (trin === 0) Spil.say(REPLIKKER["bilvask-" + f[1]] + " " + REPLIKKER[o.start], null, ["bilvask-" + f[1], o.start]);
    else si(TRIN[trin].lyd);
    hintOm(11000);
  }

  /* ---------- Vink om hvor man kan trykke, hvis barnet tøver ---------- */
  function hintOm(ms) {
    clearTimeout(hintT);
    clearTimeout(hintSlut);
    if (!alive) return;
    hintT = setTimeout(() => {
      if (!alive || travl || dragId !== null) return;
      if (vaerk !== trin) { sidstVist = 0; visVaerk(); hintOm(12000); return; }
      const mangel = new Set(mangler().map(o => o.z));
      const alleAabne = alle(".bv-plat:not(." + KLASSE[trin] + ")");
      const aabne = alleAabne.filter(b => mangel.has(b.dataset.z)).length ? alleAabne.filter(b => mangel.has(b.dataset.z)) : alleAabne;
      if (!aabne.length) return;
      const b = aabne[(Math.random() * aabne.length) | 0];
      const r = b.getBoundingClientRect();
      visPeg(r.left + r.width / 2, r.top + r.height / 2);
      hand.classList.add("hint");
      b.classList.add("peg");
      if (!Spil.isTalking()) si(TRIN[trin].lyd);
      // Skjul hånden igen, men ikke hvis barnet er i gang med at vaske (så hører den til fingeren)
      hintSlut = setTimeout(() => {
        if (!alive) return;
        b.classList.remove("peg");
        hand.classList.remove("hint");
        if (dragId === null) hand.classList.remove("syn");
      }, 4200);
    }, ms);
  }

  /* ---------- Markup ---------- */
  const HTML = `
    <div class="bv">
      <div class="bv-sol"></div>
      <div class="bv-sky a"></div>
      <div class="bv-sky b"></div>
      <div class="bv-bakke b"></div>
      <div class="bv-bakke"></div>
      <div class="bv-jord"></div>
      <div class="bv-vej">
        <div class="bv-pyt" style="left:14%;bottom:16%;width:9vh;height:2.6vh"></div>
        <div class="bv-pyt" style="left:74%;bottom:30%;width:6vh;height:1.9vh"></div>
        <div class="bv-pyt" style="left:46%;bottom:8%;width:11vh;height:2.2vh;opacity:.75"></div>
      </div>
      <div class="bv-spand" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <path d="M13 46 Q50 -34 87 46" fill="none" stroke="#8ea3b8" stroke-width="5" stroke-linecap="round"/>
          <g fill="#fff" stroke="#cfe6f5" stroke-width="1.5">
            <circle cx="22" cy="41" r="10"/><circle cx="38" cy="34" r="12"/><circle cx="56" cy="31" r="13"/>
            <circle cx="72" cy="37" r="11"/><circle cx="84" cy="42" r="8"/>
            <circle cx="92" cy="20" r="5"/><circle cx="100" cy="8" r="3.4"/>
          </g>
          <path d="M11 45 H89 L81 95 Q50 101 19 95 Z" fill="#4d96ff"/>
          <path d="M11 45 H89 L81 95 Q50 101 19 95 Z" fill="url(#bv-spandglans)"/>
          <rect x="6" y="40" width="88" height="10" rx="5" fill="#7cb4ff"/>
          <path d="M26 58 L30 86" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>
          <defs>
            <linearGradient id="bv-spandglans" x1="0" x2="1">
              <stop offset="0" stop-color="#1f3a5f" stop-opacity=".22"/>
              <stop offset=".4" stop-color="#fff" stop-opacity=".12"/>
              <stop offset="1" stop-color="#1f3a5f" stop-opacity=".28"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="bv-hal"></div>
      <div class="bv-boerste v"></div>
      <div class="bv-boerste h"></div>
      <div class="bv-bil">
        <div class="bv-indre">
          <svg class="bv-svg" viewBox="0 0 220 110" aria-hidden="true">
            <defs>
              <linearGradient id="bv-glans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity=".32"/>
                <stop offset="52%" stop-color="#fff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#000" stop-opacity=".10"/>
              </linearGradient>
            </defs>
            <ellipse cx="110" cy="100" rx="96" ry="6" fill="#1f3a5f" opacity=".14"/>
            <path d="M33 74 A23 18 0 0 1 79 74 Z M145 74 A23 18 0 0 1 191 74 Z" fill="#3b4352"/>
            ${[56, 168].map(x => `<g class="bv-hjul">
              <circle cx="${x}" cy="80" r="17" fill="#2f3542"/>
              <circle cx="${x}" cy="80" r="8" fill="#e9eff6"/>
              <path d="M${x} 73 V87 M${x - 7} 80 H${x + 7}" stroke="#a9b8c9" stroke-width="2.6" stroke-linecap="round"/>
              <circle cx="${x}" cy="80" r="2.6" fill="#7d8da0"/>
              <circle class="bv-mudder" cx="${x}" cy="80" r="13"/>
            </g>`).join("")}
            <path d="${KROP}" fill="var(--c)"/>
            <path d="${KROP}" fill="url(#bv-glans)"/>
            <path class="bv-rude" d="M 70 45 L 82 27 C 84 24 87 23 90 23 L 107 23 L 107 45 Z"/>
            <path class="bv-rude" d="M 113 45 L 113 23 L 133 23 C 137 23 140 25 142 28 L 154 45 Z"/>
            <rect x="196" y="54" width="16" height="11" rx="5" fill="#ffe9a8"/>
            <rect x="4" y="54" width="13" height="10" rx="4.5" fill="#ff9d9d"/>
            <path d="M109 48 V70" stroke="rgba(0,0,0,.10)" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="90" y="52.5" width="11" height="3.4" rx="1.7" fill="rgba(0,0,0,.18)"/>
            <rect x="127" y="52.5" width="11" height="3.4" rx="1.7" fill="rgba(0,0,0,.18)"/>
            <rect x="195" y="66" width="22" height="8" rx="4" fill="#dfe6ee"/>
            <rect x="-1" y="66" width="20" height="8" rx="4" fill="#dfe6ee"/>
            <circle cx="197" cy="66" r="2.4" fill="#fff" opacity=".55"/>
          </svg>
          <div class="bv-kabine"><div class="bv-chauffoer">🐻</div></div>
          <div class="bv-vandlag"></div>
          <div class="bv-pletter"></div>
          <div class="bv-sudlag"></div>
        </div>
      </div>
      <div class="bv-taeller"><span aria-hidden="true">🚗</span><b>0</b></div>
      <div class="bv-trins">
        ${TRIN.map((t, i) => `<button class="bv-trin" data-i="${i}" aria-label="${["Vand", "Sæbe", "Svamp"][i]}">${t.ikon}</button>`).join("")}
      </div>
      <div class="bv-lag"></div>
      <div class="bv-straal" aria-hidden="true"></div>
      <div class="bv-hand" aria-hidden="true">💧</div>
    </div>`;

  /* ---------- Spillet ---------- */
  Spil.register({
    id: "bilvasken", navn: "Bilvasken", ikon: "🧼", farve: "#bfe6fb",
    start(r) {
      alive = true; timers = []; travl = true; dragId = null; trin = 0; rostet = false;
      spray = null; sidstePuf = 0; peg = null; straalVinkel = 0; clearTimeout(hintT); clearTimeout(hintSlut); clearInterval(holdT);
      hent();
      const dm = /^(krop|hjul|ruder)?-?(vand|saebe|svamp|ren)?$/.exec(Spil.dyb || "");
      test = !!(Spil.dyb && dm);
      dybOpg = test ? dm[1] || "krop" : "";
      dybTrin = test ? ["vand", "saebe", "svamp", "ren"].indexOf(dm[2] || "vand") : 0;
      r.innerHTML = HTML;
      root = r.querySelector(".bv");
      bil = root.querySelector(".bv-bil");
      indre = root.querySelector(".bv-indre");
      chauffoer = root.querySelector(".bv-chauffoer");
      pletterEl = root.querySelector(".bv-pletter");
      hand = root.querySelector(".bv-hand");
      lag = root.querySelector(".bv-lag");
      straal = root.querySelector(".bv-straal");
      vandLag = root.querySelector(".bv-vandlag");
      sudLag = root.querySelector(".bv-sudlag");
      taeller = root.querySelector(".bv-taeller b");
      taeller.textContent = vasket;
      Spil.preload(NOEGLER);
      vaerk = -1; forkert = 0; sidstVist = 0;
      opdaterTrins();
      alle(".bv-trin").forEach((el, i) => el.addEventListener("pointerdown", e => {
        try { e.preventDefault(); } catch (err) {}
        vaelgVaerk(i);
      }));

      bil.addEventListener("pointerdown", e => {
        if (!alive || travl) return;
        try { e.preventDefault(); } catch (err) {}
        dragId = e.pointerId;
        try { bil.setPointerCapture(e.pointerId); } catch (err) {}
        hand.classList.remove("hint");
        root.classList.add("washer");
        if (vaerk >= 0) sprayOn();
        visPeg(e.clientX, e.clientY);
        if (vaerk === 0) straale(e.clientX, e.clientY);
        rubAt(e.clientX, e.clientY);
        // Holder man fingeren stille, skrubber svampen videre af sig selv (godt for de mindste)
        clearInterval(holdT);
        holdT = setInterval(() => {
          if (!alive || dragId === null || !peg) return;
          if (vaerk === 0) straale(peg.x, peg.y);
          rubAt(peg.x, peg.y);
        }, 220);
      });
      bil.addEventListener("pointermove", e => {
        if (dragId !== e.pointerId) return;
        try { e.preventDefault(); } catch (err) {}
        // Strålen peger samme vej som fingeren bevæger sig, og lyden følger farten
        const dx = e.clientX - (peg ? peg.x : e.clientX), dy = e.clientY - (peg ? peg.y : e.clientY);
        const flyt = Math.hypot(dx, dy);
        if (flyt > 3) {
          fart = flyt;
          straalVinkel = Math.atan2(dy, dx);
          if (spray && spray.bp) {
            try {
              spray.bp.frequency.setTargetAtTime(1300 + Math.min(flyt, 40) * 45, spray.c.currentTime, .05);
            } catch (err) {}
          }
        }
        visPeg(e.clientX, e.clientY);
        if (vaerk === 0) straale(e.clientX, e.clientY);
        rubAt(e.clientX, e.clientY);
      });
      const slip = e => {
        if (dragId !== e.pointerId) return;
        dragId = null;
        clearInterval(holdT);
        sprayOff();
        straaleVaek();
        fart = 0; // næste tryk starter roligt igen
        root.classList.remove("washer");
        hand.classList.remove("syn", "hint");
      };
      bil.addEventListener("pointerup", slip);
      bil.addEventListener("pointercancel", slip);

      later(() => naesteBil(true), 500);
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      timers = [];
      clearTimeout(hintT);
      clearTimeout(hintSlut);
      clearInterval(holdT);
      dragId = null;
      sprayOff();
      spray = null;
      straaleVaek();
      lag = null;
      root = null;
    }
  });
})();
