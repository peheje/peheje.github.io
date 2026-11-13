// Spil: Skraldebilen — skraldebilen holder ved en gade, og barnet sorterer skrald i de rigtige spande.
// To måder at spille på, som begge virker hele tiden:
//   1) Træk skraldet hen til en spand (pointer events + setPointerCapture, touch-action:none).
//   2) Tryk på skraldet (stemmen siger, hvad det er) og tryk derefter på en spand, så flyver skraldet
//      derhen i en bue. Godt for de mindste, der ikke kan trække endnu.
// Rigtigt: skraldet lander i spanden med et "klonk", spanden hopper, der kommer konfetti og ros.
// Forkert: skraldet glider blidt tilbage, stemmen siger "Prøv igen", og den rigtige spand vipper og lyser.
// Efter 5 stykker skrald bakker bilen hen, løfter spandene én ad gangen og knaser skraldet, hvorefter den
// kører videre til en ny gade. Første gade har kun to spande (mad og papir); glas kommer til bagefter.
// Efter tre gader er der fest. Ingen tabe-tilstand nogen steder.
(function () {
  /* ---------- Skrald og spande ---------- */
  // Spandene: farve (krop og låg) og et stort billede af det, der hører i spanden. Ingen tekst.
  const TYPER = {
    mad: { navn: "mad", krop: "#a5682a", laag: "#7a4818", ikon: "🍌" },
    papir: { navn: "papir", krop: "#3f7fd0", laag: "#2b5fa4", ikon: "📰" },
    glas: { navn: "glas", krop: "#3f9e5a", laag: "#2c7442", ikon: "🍾" }
  };
  // Skraldet: emoji, hvilken spand det hører til, lydnøgle, og hvad stemmen siger.
  // "nemt" er de slags skrald, der er med i den første gade (kun mad og papir, få slags).
  const SKRALD = [
    { e: "🍌", t: "mad", k: "skrald-bananskal", s: "Et bananskal!", nemt: true },
    { e: "🍎", t: "mad", k: "skrald-aebleskrog", s: "Et æbleskrog!", nemt: true },
    { e: "🥚", t: "mad", k: "skrald-aeggeskal", s: "Et æggeskal!" },
    { e: "🥕", t: "mad", k: "skrald-gulerod", s: "En gulerod!" },
    { e: "🍞", t: "mad", k: "skrald-broed", s: "Et stykke brød!", nemt: true },
    { e: "📰", t: "papir", k: "skrald-avis", s: "En avis!", nemt: true },
    { e: "📦", t: "papir", k: "skrald-papkasse", s: "En papkasse!", nemt: true },
    { e: "✉️", t: "papir", k: "skrald-brev", s: "Et brev!" },
    { e: "📄", t: "papir", k: "skrald-papir", s: "Et stykke papir!" },
    { e: "🍾", t: "glas", k: "skrald-flaske", s: "En flaske!" },
    { e: "🫙", t: "glas", k: "skrald-glas", s: "Et glas!" },
    { e: "🥛", t: "glas", k: "skrald-maelk", s: "Et glas mælk!" }
  ];
  const ROS = [["Super!", "ros-0"], ["Flot klaret!", "ros-1"], ["Sejt!", "ros-2"],
    ["Du er god til det!", "ros-3"], ["Wow!", "ros-4"]];
  const HEJ = "Hej! Kan du hjælpe skraldebilen med at sortere skrald? Træk skraldet hen til den rigtige spand.";
  // Tre gader med hver sit vejr, sine huse (hus, tag) og sine træer (rund, gran eller hoest = efterårsfarver)
  const GADER = [
    { himmel: ["#8fd3f7", "#dff3ff"], trae: "rund",
      huse: [["#f7d9a8", "#c9553f"], ["#f2b8b0", "#8c4a56"], ["#d6e7f7", "#4f6c9c"], ["#f7e6b8", "#b9803a"]] },
    { himmel: ["#a9e2ef", "#eefaff"], trae: "gran",
      huse: [["#f7c9a0", "#a84c3c"], ["#d8d2f0", "#5c4c94"], ["#e8f0c8", "#6a8c3a"], ["#f7d9a8", "#8c5a2f"]] },
    { himmel: ["#ffd6ad", "#fff4e4"], trae: "hoest",
      huse: [["#f0d0c0", "#9c4436"], ["#c9e0d8", "#3f7a6a"], ["#f7e0a8", "#b07a2a"], ["#dcd6f7", "#5a4a94"]] }
  ];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  Spil.css("css-skraldebilen", `
    .sb{position:relative;height:100%;overflow:hidden;display:flex;flex-direction:column;touch-action:none;
      --st:clamp(88px,15vh,150px);--spandh:clamp(136px,24vh,210px);
      padding-left:max(8px,env(safe-area-inset-left,0px));
      padding-right:max(8px,env(safe-area-inset-right,0px));
      background:#cfeaff}
    .sb *{box-sizing:border-box}

    /* Lyden-igen-knappen (hjem-knappen sidder fast oppe til venstre) */
    .sb-sig{position:absolute;z-index:12;top:calc(2vh + env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));
      width:clamp(56px,8.6vh,78px);aspect-ratio:1;border-radius:50%;background:var(--sun);line-height:1;
      box-shadow:0 6px 0 #d9a21a;font-size:clamp(24px,4vh,36px)}
    .sb-sig:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}

    /* Fem prikker: hvor mange stykker skrald der er sorteret i denne gade */
    .sb-taeller{position:absolute;z-index:12;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);
      display:flex;gap:clamp(6px,1.4vh,14px);padding:clamp(6px,1.2vh,12px) clamp(10px,2vh,20px);border-radius:999px;
      background:rgba(255,255,255,.78);box-shadow:0 4px 0 rgba(31,58,95,.12);pointer-events:none}
    .sb-taeller span{width:clamp(13px,2.2vh,22px);aspect-ratio:1;border-radius:50%;background:#dbe6ee;
      box-shadow:inset 0 2px 0 rgba(0,0,0,.08);transition:background .2s}
    .sb-taeller span.fyldt{background:#5cc46b;box-shadow:inset 0 2px 0 rgba(255,255,255,.45)}

    /* ---------- Scenen: himmel, huse, fortov og vej ---------- */
    .sb-scene{position:relative;flex:1;min-height:0;overflow:hidden;
      background:linear-gradient(#8fd3f7,#dff3ff 58%,#f6fcff);transition:background .6s}
    /* Solen og skyerne er tegnet (emoji ser små og grå ud på iPad) */
    .sb-sol{position:absolute;z-index:0;top:5%;right:clamp(96px,15vh,140px);width:clamp(48px,10vh,96px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 40% 38%,#fff6b8,#ffd23f 55%,#ffb61e);
      box-shadow:0 0 0 clamp(5px,1vh,10px) rgba(255,224,102,.45),0 0 34px 10px rgba(255,210,63,.55)}
    .sb-sol::before{content:"";position:absolute;inset:-34%;z-index:-1;border-radius:50%;
      background:repeating-conic-gradient(rgba(255,206,52,.75) 0 9deg,rgba(255,206,52,0) 9deg 30deg);
      animation:sb-straaler 60s linear infinite}
    @keyframes sb-straaler{to{transform:rotate(1turn)}}
    .sb-sky{position:absolute;width:calc(clamp(74px,14vw,176px) * var(--s,1));aspect-ratio:2.4/1;opacity:.95;
      background:
        radial-gradient(closest-side,#fff 94%,rgba(255,255,255,0)) 6% 100%/30% 72% no-repeat,
        radial-gradient(closest-side,#fff 94%,rgba(255,255,255,0)) 44% 0/44% 100% no-repeat,
        radial-gradient(closest-side,#fff 94%,rgba(255,255,255,0)) 90% 90%/32% 76% no-repeat,
        radial-gradient(closest-side,#f4f9fd 94%,rgba(255,255,255,0)) 50% 100%/94% 52% no-repeat;
      filter:drop-shadow(0 5px 6px rgba(120,170,210,.3));animation:sb-driv 26s ease-in-out infinite alternate}
    .sb-sky-1{top:9%;left:9%;animation-duration:24s}
    .sb-sky-2{top:24%;left:42%;--s:.7;animation-duration:32s;opacity:.8}
    .sb-sky-3{top:12%;left:62%;--s:.85;animation-duration:29s;opacity:.88}
    @keyframes sb-driv{to{transform:translateX(clamp(18px,6vw,80px))}}

    .sb-huse{position:absolute;left:0;right:0;bottom:30%;z-index:1;display:flex;align-items:flex-end;
      justify-content:space-around;padding:0 3%}
    /* Et hus: tag med udhæng og skorsten, to etager vinduer med sprosser og en dør med håndtag */
    .sb-hus{position:relative;width:clamp(62px,15vw,190px);display:flex;flex-direction:column;align-items:stretch;
      --tagh:calc(clamp(26px,min(7vh,9vw),66px) * var(--f,1));
      filter:drop-shadow(0 6px 8px rgba(60,90,120,.14))}
    .sb-hus-skorsten{position:absolute;right:20%;top:calc(var(--tagh) * .08);width:12%;height:calc(var(--tagh) * .6);
      background:linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,.28)),var(--tag,#b06a4a);border-radius:2px 2px 0 0;
      box-shadow:inset 0 4px 0 rgba(0,0,0,.18)}
    .sb-hus-tag{position:relative;margin:0 -7%;height:var(--tagh);
      background:linear-gradient(rgba(0,0,0,0) 84%,rgba(0,0,0,.22) 84%),
        repeating-linear-gradient(rgba(0,0,0,.08) 0 2px,rgba(0,0,0,0) 2px 22%),var(--tag,#b06a4a);
      clip-path:polygon(50% 0,100% 100%,0 100%)}
    .sb-hus-krop{position:relative;height:calc(clamp(56px,min(15vh,24vw),150px) * var(--f,1));background:var(--hus,#f4dfb9);
      box-shadow:inset 0 -7px 0 rgba(0,0,0,.06),inset 0 8px 6px -4px rgba(0,0,0,.12)}
    .sb-vin{position:absolute;width:26%;height:30%;border-radius:2px;
      background:linear-gradient(90deg,rgba(0,0,0,0) 45%,#fff 45% 55%,rgba(0,0,0,0) 55%),
        linear-gradient(rgba(0,0,0,0) 45%,#fff 45% 55%,rgba(0,0,0,0) 55%),
        linear-gradient(160deg,#eef9ff 0 35%,#b8e0f7 36%);
      box-shadow:0 0 0 clamp(2px,.4vw,4px) #fff,0 clamp(3px,.6vw,6px) 0 clamp(2px,.4vw,4px) rgba(0,0,0,.12)}
    .sb-vin:nth-child(1){left:14%;top:13%} .sb-vin:nth-child(2){right:14%;top:13%} .sb-vin:nth-child(3){left:14%;top:56%}
    .sb-doer{position:absolute;right:15%;bottom:0;width:27%;height:44%;border-radius:clamp(4px,1vw,12px) clamp(4px,1vw,12px) 0 0;
      background:radial-gradient(circle at 78% 55%,#ffd23f 0 6%,rgba(0,0,0,0) 7%),
        linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),var(--tag,#b06a4a);
      box-shadow:inset 0 0 0 clamp(2px,.3vw,3px) rgba(0,0,0,.15)}
    /* Tegnede træer mellem husene: stamme + krone (rund, gran eller i efterårsfarver) */
    .sb-tre{position:relative;align-self:flex-end;width:clamp(30px,6vw,80px);aspect-ratio:.68;
      --k1:#8fd46a;--k2:#4f9a3c;filter:drop-shadow(0 5px 6px rgba(40,90,50,.2))}
    .sb-tre::before{content:"";position:absolute;left:42%;bottom:0;width:16%;height:36%;border-radius:3px 3px 0 0;
      background:linear-gradient(90deg,#8a5a34,#6b4226)}
    .sb-tre::after{content:"";position:absolute;left:0;right:0;top:0;height:76%;border-radius:50% 50% 46% 46%;
      background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.3) 0 14%,rgba(255,255,255,0) 15%),
        radial-gradient(circle at 70% 64%,rgba(0,0,0,.12) 0 16%,rgba(0,0,0,0) 17%),
        radial-gradient(circle at 36% 30%,var(--k1),var(--k2))}
    .sb-tre.hoest{--k1:#ffc44d;--k2:#e0702a}
    .sb-tre.gran{--k1:#5fb064;--k2:#2f7340}
    .sb-tre.gran::after{height:86%;border-radius:0;background:linear-gradient(100deg,var(--k1),var(--k2));
      clip-path:polygon(50% 0,74% 30%,63% 30%,86% 60%,72% 60%,100% 92%,0 92%,28% 60%,14% 60%,37% 30%,26% 30%)}

    /* Græs foran husene, så store fliser, så kantstenen ned mod vejen */
    .sb-fortov{position:absolute;left:0;right:0;bottom:15%;height:15%;z-index:0;
      background:
        linear-gradient(#8fd06a,#6bb34c 80%,#5a9a40) 0 0/100% 24% no-repeat,
        linear-gradient(#f6f3ec,#d9d3c7 70%,#b9b2a4) 0 100%/100% 17% no-repeat,
        linear-gradient(rgba(0,0,0,0) 48%,rgba(120,110,95,.2) 48% 52%,rgba(0,0,0,0) 52%) 0 59%/100% 59% no-repeat,
        repeating-linear-gradient(90deg,rgba(120,110,95,.24) 0 2px,rgba(0,0,0,0) 2px clamp(56px,9vw,104px)) 0 59%/100% 59% no-repeat,
        linear-gradient(#ece6da,#e2dbcd);
      box-shadow:inset 0 -2px 0 #a59e90}
    .sb-vej{position:absolute;left:0;right:0;bottom:0;height:15%;background:#5f6673;
      background-image:repeating-linear-gradient(90deg,#ffd23f 0 30px,rgba(0,0,0,0) 30px 74px);
      background-size:100% 6px;background-position:0 58%;background-repeat:no-repeat;
      box-shadow:inset 0 5px 0 rgba(0,0,0,.18)}

    /* ---------- Skraldebilen ---------- */
    .sb-bil{position:absolute;left:50%;bottom:calc(clamp(6px,2vh,18px) + 1%);z-index:2;width:clamp(150px,30vw,360px);aspect-ratio:2.2/1;
      transform:translateX(calc(-50% + var(--dx,0px)));
      transition:transform .9s cubic-bezier(.35,.05,.55,1);pointer-events:none}
    .sb-bil.kører{transition-duration:1.6s}
    /* Chassis og kofanger under hele bilen */
    .sb-bil::before{content:"";position:absolute;left:2%;right:0;bottom:13%;height:12%;border-radius:3px 4px 4px 3px;
      background:linear-gradient(#5b6170,#3a3f4b);box-shadow:inset 0 2px 0 rgba(255,255,255,.18)}
    .sb-bil-kasse{position:absolute;left:0;bottom:22%;width:68%;height:72%;border-radius:12px 8px 3px 6px;
      background:
        linear-gradient(rgba(0,0,0,0) 52%,#f4f7f2 52% 60%,rgba(0,0,0,0) 60%),
        repeating-linear-gradient(90deg,rgba(0,0,0,.09) 0 3px,rgba(0,0,0,0) 3px 16%),
        linear-gradient(#6cc581,#3d8d54);
      box-shadow:inset 0 6px 0 rgba(255,255,255,.3),inset 0 -8px 0 rgba(0,0,0,.14),inset -4px 0 0 rgba(0,0,0,.12)}
    /* Bagenden, hvor spandene tømmes: mørk åbning og en rød baglygte */
    .sb-bil-laas{position:absolute;left:-1%;bottom:22%;width:10%;height:62%;border-radius:8px 3px 3px 8px;
      background:linear-gradient(90deg,#24603a,#2f7a44);box-shadow:inset 2px 0 0 rgba(255,255,255,.18)}
    .sb-bil-laas::after{content:"";position:absolute;left:18%;bottom:8%;width:40%;height:12%;border-radius:2px;background:#ff5a4f}
    .sb-bil-kabine{position:absolute;right:0;bottom:22%;width:30%;height:60%;border-radius:8px 34% 6px 4px;
      background:linear-gradient(#ffb14a,#ef8a2b);box-shadow:inset 0 4px 0 rgba(255,255,255,.3),
        inset 0 -6px 0 rgba(0,0,0,.12)}
    /* Dørens kant og håndtag */
    .sb-bil-kabine::before{content:"";position:absolute;left:16%;top:22%;width:44%;bottom:12%;border-radius:4px;
      box-shadow:inset 0 0 0 2px rgba(150,70,10,.3)}
    .sb-bil-kabine::after{content:"";position:absolute;left:44%;top:56%;width:12%;height:5%;border-radius:2px;background:rgba(120,55,8,.5)}
    .sb-bil-rude{position:absolute;right:3%;bottom:52%;width:21%;height:26%;border-radius:3px 60% 3px 3px;
      background:linear-gradient(135deg,#eaf7ff 0 40%,#bfe3fb 40% 55%,#d6efff 55%);box-shadow:inset 0 0 0 2px rgba(31,58,95,.28)}
    .sb-bil-lygte{position:absolute;right:0;bottom:27%;width:5%;height:9%;border-radius:3px 0 0 3px;background:#fff3b0;
      box-shadow:0 0 8px #fff3b0}
    .sb-bil-blaalys{position:absolute;right:12%;bottom:81%;width:10%;height:7%;border-radius:4px 4px 1px 1px;
      background:#4d96ff;animation:sb-blaalys 1.1s steps(1,end) infinite}
    @keyframes sb-blaalys{50%{background:#9ecbff;box-shadow:0 0 12px #9ecbff}}
    .sb-bil-hjul{position:absolute;bottom:0;width:19%;aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle,#5b6170 0 8%,rgba(0,0,0,0) 9%),
        radial-gradient(circle,rgba(0,0,0,0) 0 31%,#9aa1b0 32% 35%,#2b2f3a 36% 66%,#3a3f4b 67%),
        repeating-conic-gradient(#d4d7df 0 12%,#a3a8b5 12% 20%);
      filter:drop-shadow(0 2px 0 rgba(0,0,0,.22));
      /* hjulet drejer lige så langt, som bilen kører (--rul sættes i start()), med bilens egen fart */
      transform:rotate(var(--rul,0deg));transition:inherit}
    .sb-hjul-a{left:11%} .sb-hjul-b{right:13%}
    .sb-bil.ryster .sb-bil-kasse{animation:sb-ryst .16s linear infinite}
    @keyframes sb-ryst{25%{transform:translateY(-2px)}75%{transform:translateY(2px)}}

    /* Bunken på fortovet (det er her skraldet ligger) */
    .sb-bunke{position:absolute;left:22%;bottom:24%;width:0;height:0;z-index:0}
    .sb-bunke::after{content:"";position:absolute;left:50%;top:calc(var(--st) * .36);width:calc(var(--st) * .72);
      aspect-ratio:2.6/1;transform:translate(-50%,-50%);border-radius:50%;
      background:radial-gradient(closest-side,rgba(90,70,45,.2),rgba(90,70,45,0))}

    /* ---------- Skraldet, der trækkes rundt ---------- */
    .sb-skrald{position:absolute;left:0;top:0;z-index:40;width:var(--st);height:var(--st);
      display:grid;place-items:center;font-size:calc(var(--st) * .84);line-height:1;border-radius:50%;
      background:radial-gradient(closest-side,rgba(255,250,232,.55) 0 32%,rgba(255,250,232,0) 92%);
      filter:drop-shadow(0 0 3px rgba(31,58,95,.4)) drop-shadow(0 8px 8px rgba(40,70,100,.3));
      transform-origin:50% 50%;will-change:transform;touch-action:none;cursor:grab;
      -webkit-user-drag:none;-webkit-touch-callout:none}
    .sb-skrald.loftet{cursor:grabbing;z-index:41;
      filter:drop-shadow(0 16px 14px rgba(40,70,100,.34)) drop-shadow(0 0 14px rgba(255,255,255,.95))}
    .sb-skrald.valgt{filter:drop-shadow(0 10px 10px rgba(40,70,100,.3)) drop-shadow(0 0 18px #fff);
      animation:sb-pust 1.3s ease-in-out infinite}
    @keyframes sb-pust{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.95)}55%{box-shadow:0 0 0 12px rgba(255,255,255,0)}}
    .sb-skrald.ny{animation:sb-ind .45s ease-out}
    @keyframes sb-ind{from{opacity:0}to{opacity:1}}

    /* ---------- Spandene ---------- */
    .sb-spande{position:relative;z-index:3;display:flex;justify-content:center;align-items:flex-end;
      gap:clamp(8px,1.6vw,22px);height:var(--spandh);margin-top:calc(-1 * clamp(6px,2vh,18px));
      padding:0 max(4px,env(safe-area-inset-right,0px)) max(6px,env(safe-area-inset-bottom,0px)) max(4px,env(safe-area-inset-left,0px))}
    .sb-spand{position:relative;flex:1 1 0;max-width:clamp(180px,26vw,300px);height:100%;min-width:92px;display:flex;flex-direction:column;
      padding:0;background:transparent;border:0;cursor:pointer;transform-origin:50% 100%;
      touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .sb-spand.skjult{display:none}
    /* En rigtig affaldsspand set forfra: låg med håndtag, krop der bliver smallere nedad, to hjul */
    .sb-spand{padding-bottom:calc(var(--spandh) * .08)}
    .sb-spand::after{content:"";position:absolute;left:10%;right:10%;bottom:0;height:calc(var(--spandh) * .11);
      pointer-events:none;--h:radial-gradient(circle closest-side,#9aa1b0 0 28%,#2b2f3a 33% 94%,rgba(0,0,0,0) 100%);
      background:var(--h) left/calc(var(--spandh) * .11) 100% no-repeat,var(--h) right/calc(var(--spandh) * .11) 100% no-repeat}
    .sb-spand .sb-laag{display:block;position:relative;z-index:1;height:15%;margin:0 -2%;border-radius:14px 14px 6px 6px;
      background:linear-gradient(rgba(255,255,255,.38),rgba(255,255,255,0) 45%,rgba(0,0,0,.18)),var(--laag);
      box-shadow:0 4px 0 rgba(0,0,0,.22)}
    .sb-spand .sb-laag::after{content:"";position:absolute;left:50%;top:-16%;transform:translateX(-50%);
      width:42%;height:36%;border-radius:8px 8px 3px 3px;background:var(--laag);
      box-shadow:inset 0 3px 0 rgba(255,255,255,.3),inset 0 -3px 0 rgba(0,0,0,.25)}
    .sb-spand .sb-krop{position:relative;flex:1;display:grid;place-items:center;margin:0 1.5%;
      border-radius:4px 4px 14px 14px;clip-path:polygon(0 0,100% 0,95% 100%,5% 100%);container-type:inline-size;
      background:
        linear-gradient(90deg,rgba(0,0,0,.16),rgba(0,0,0,0) 14% 86%,rgba(0,0,0,.16)),
        linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,0) 12%,rgba(255,255,255,.12) 70%,rgba(0,0,0,.14)),var(--krop);
      transition:transform .15s}
    .sb-spand .sb-krop::after{content:"";position:absolute;left:14%;right:14%;bottom:7%;height:6%;
      border-radius:6px;background:rgba(0,0,0,.2)}
    /* Billedet sidder på et hvidt mærke, så det kan ses på alle farver */
    .sb-ikon{display:grid;place-items:center;width:min(calc(var(--spandh) * .56),78%);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 50% 38%,#fff,#eef3f6);box-shadow:0 4px 0 rgba(0,0,0,.2),inset 0 -4px 0 rgba(31,58,95,.08);
      font-size:calc(var(--spandh) * .34);font-size:min(calc(var(--spandh) * .34),50cqw);line-height:1;
      transition:opacity .3s,transform .3s}
    .sb-spand.tomt .sb-ikon{opacity:0;transform:scale(.55)}

    .sb-spand.hop{animation:sb-hop .75s cubic-bezier(.3,1.3,.5,1)}
    .sb-spand.hop .sb-laag{animation:sb-laag .75s ease-out}
    @keyframes sb-hop{0%,100%{transform:none}30%{transform:translateY(-16px) scale(1.05,.95)}
      62%{transform:translateY(0) scale(.97,1.04)}82%{transform:translateY(-4px) scale(1,1)}}
    @keyframes sb-laag{0%,100%{transform:none}30%{transform:rotate(-9deg) translateY(-5px)}}
    .sb-spand.hint{animation:sb-vip .7s ease-in-out 3;filter:drop-shadow(0 0 20px #fff)}
    @keyframes sb-vip{0%,100%{transform:none}20%{transform:rotate(-4deg)}55%{transform:rotate(4deg)}80%{transform:rotate(-2deg)}}
    .sb-spand.fejl{animation:sb-ryst-spand .32s}
    @keyframes sb-ryst-spand{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
    .sb-spand.over{filter:drop-shadow(0 0 18px #fff) brightness(1.1)}
    .sb-spand.over .sb-krop{transform:translateY(-5px)}
    .sb-spand.over .sb-laag{transform:translateY(-5px)}
    .sb-spand.toem{animation:sb-toem 1.5s cubic-bezier(.35,0,.35,1)}
    /* Spanden løftes op bag på bilen og tippes ind i den (bilens bagende er til venstre, så med uret) */
    @keyframes sb-toem{0%,100%{transform:none}
      18%{transform:translateY(calc(var(--loft,60px) * -1)) scale(.86)}
      32%,58%{transform:translateY(calc(var(--loft,60px) * -1)) rotate(40deg) scale(.86)}
      72%{transform:translateY(calc(var(--loft,60px) * -1)) scale(.86)}}
    .sb-spand.ny{animation:sb-ny-ind .85s cubic-bezier(.3,1.5,.5,1)}
    @keyframes sb-ny-ind{0%{transform:translateY(70px) scale(.55);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}

    /* Telefon på højkant: skraldet midt på skærmen, spandene som tre brede knapper i bunden */
    @media (max-aspect-ratio:1/1){
      .sb-bunke{left:50%;bottom:26%}
      .sb-sol{top:17%;left:9%;right:auto;width:clamp(40px,12vw,72px)}
      .sb-sky-3{top:20%;left:66%}
      .sb-sky-1{top:31%;left:4%}
      .sb-hus{width:clamp(54px,16vw,110px)}
      .sb-bil{width:clamp(150px,52vw,260px)}
      .sb-tre{width:clamp(28px,8vw,60px)}
    }
    @media (prefers-reduced-motion:reduce){
      .sb-sky,.sb-bil-blaalys,.sb-sol::before{animation:none}
      .sb-bil,.sb-spand .sb-krop,.sb-spand .sb-laag,.sb-taeller span{transition:none}
      .sb-spand.hop,.sb-spand.hint,.sb-spand.fejl,.sb-spand.toem,.sb-spand.ny,
      .sb-spand.hop .sb-laag,.sb-skrald.valgt,.sb-skrald.ny,.sb-bil.ryster .sb-bil-kasse{animation:none}
    }
  `);

  let root, alive, timers, sb, bil, pile, spande, stk, drag, valgt, busy, koe, taeller, gadeNr, faerdige,
    ventIntro, sidstFejl, kilder;
  let rulObs;
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; };
  const q = s => root.querySelector(s);
  const alle = s => [...root.querySelectorAll(s)];

  /* ---------- Lyd (små byggeklodser oven på Web Audio) ---------- */
  // Alle kilder samles, så de kan stoppes med det samme, når man går hjem
  const husk = n => { kilder.push(n); return n; };
  function stopLyd() {
    kilder.forEach(n => { try { n.stop(); } catch (e) {} });
    kilder = [];
  }
  function tone(type, pts, t0, dur, peak = .3, lp = 0, vib = null) {
    const a = Spil.audio(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(pts[0][1], t);
    pts.slice(1).forEach(([f, hz]) => o.frequency.exponentialRampToValueAtTime(hz, t + f * dur));
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.06, dur * .25));
    g.gain.setValueAtTime(peak, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let n = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); n = f; }
    if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1];
      l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .05); husk(l); }
    n.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05); husk(o);
  }
  function noise(t0, dur, freq, peak = .3, qv = 1, to = 0) {
    const a = Spil.audio(), t = a.currentTime + t0, len = Math.max(1, Math.ceil(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = "bandpass"; f.Q.value = qv; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .03);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur); husk(s);
  }
  // Skraldet lander i spanden: et blødt "klonk"
  function klonk() {
    try {
      tone("sine", [[0, 300], [.3, 118], [1, 68]], 0, .3, .4, 0, [11, 24]);
      noise(0, .09, 230, .2, 1.2, 85);
      tone("triangle", [[0, 640], [1, 300]], .01, .09, .1);
    } catch (e) {}
  }
  // Bilen knaser skraldet: støj i stød + en dyb brummen
  function knas() {
    try {
      for (let i = 0; i < 7; i++) {
        const dur = .09;
        noise(i * .1, dur, 420 + Math.random() * 1300, .16, .8);
      }
      tone("sawtooth", [[0, 90], [.5, 62], [1, 44]], 0, .78, .12, 420);
    } catch (e) {}
  }
  // Bilens motor
  function motor(sec) {
    try {
      const a = Spil.audio(), t = a.currentTime, o = a.createOscillator(), o2 = a.createOscillator(),
        g = a.createGain(), lp = a.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.setValueAtTime(56, t); o.frequency.linearRampToValueAtTime(76, t + sec * .7);
      o2.type = "square"; o2.frequency.value = 28;
      lp.type = "lowpass"; lp.frequency.value = 300;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.055, t + .15);
      g.gain.setValueAtTime(.055, t + Math.max(.2, sec - .35)); g.gain.exponentialRampToValueAtTime(.0001, t + sec);
      o.connect(lp); o2.connect(lp); lp.connect(g).connect(a.destination);
      o.start(t); o2.start(t); o.stop(t + sec + .06); o2.stop(t + sec + .06); husk(o); husk(o2);
    } catch (e) {}
  }
  // "Tut tut" og bakke-bip
  const tut = () => { try {
    tone("square", [[0, 440]], 0, .16, .09, 2200);
    tone("square", [[0, 494]], .24, .2, .09, 2200);
  } catch (e) {} };
  const bakkeBip = () => { try { Spil.tone([1250, 1250, 1250], .17, "square"); } catch (e) {} };

  /* ---------- Hjælpere ---------- */
  const sbRect = () => sb.getBoundingClientRect();
  function pilePos() {
    const s = sbRect(), r = pile.getBoundingClientRect();
    const w = stk && stk.el ? stk.el.offsetWidth : 0;
    return { x: r.left - s.left - w / 2, y: r.top - s.top - w / 2 };
  }
  function spandFor(type) { return spande.find(b => b.dataset.type === type && !b.classList.contains("skjult")); }
  function rydValg() {
    valgt = false;
    alle(".sb-skrald").forEach(e => e.classList.remove("valgt"));
  }
  function visTaeller() {
    alle(".sb-taeller span").forEach((s, i) => s.classList.toggle("fyldt", i < taeller));
  }

  // Spanden under fingeren (eller den nærmeste, hvis man slipper lidt ved siden af)
  function spandUnder(x, y, under) {
    let bedste = null, mindst = Infinity;
    for (const b of spande) {
      if (b.classList.contains("skjult")) continue;
      const r = b.getBoundingClientRect();
      const pad = under ? 26 : 44;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return b;
      const af = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (af < mindst) { mindst = af; bedste = b; }
    }
    return !under && mindst < 120 ? bedste : null;
  }

  /* ---------- Skraldet ---------- */
  function sigStk() {
    if (!alive || busy || !stk || !stk.el) return;
    const s = stk;
    Spil.say(s.s + " Hvor skal det hen?", null, [s.k, "skrald-hvor"]);
  }
  function sigEfterIntro() { if (!alive || !ventIntro) return; ventIntro = false; sigStk(); }

  function naeste() {
    if (!alive) return;
    busy = false; rydValg();
    if (!koe.length) return;
    const s = koe.shift();
    const el = document.createElement("div");
    el.className = "sb-skrald ny";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", s.s);
    el.textContent = s.e;
    el.addEventListener("pointerdown", startTraek);
    el.addEventListener("contextmenu", e => e.preventDefault());
    sb.appendChild(el);
    stk = { slags: s.t, s: s.s, k: s.k, el, x: 0, y: 0 };
    const p = pilePos();
    stk.x = p.x; stk.y = p.y;
    el.style.transform = `translate(${p.x}px,${p.y}px)`;
    later(() => { if (el.isConnected) el.classList.remove("ny"); }, 700);
    if (!ventIntro) later(sigStk, 220);
  }

  function glideTilbage() {
    if (!stk || !stk.el) return;
    const el = stk.el, p = pilePos();
    stk.x = p.x; stk.y = p.y;
    el.classList.remove("loftet");
    el.style.transition = "transform .45s cubic-bezier(.3,1.25,.5,1)";
    el.style.transform = `translate(${p.x}px,${p.y}px)`;
    later(() => { if (el.isConnected && !drag) el.style.transition = ""; }, 500);
  }

  function forkert(spand) {
    if (!stk || !stk.el) return;
    if (spand) {
      spand.classList.remove("fejl"); void spand.offsetWidth; spand.classList.add("fejl");
      later(() => spand.classList.remove("fejl"), 700);
    }
    const rigtig = spandFor(stk.slags);
    if (rigtig) { // den rigtige spand vipper og lyser svagt
      rigtig.classList.remove("hint"); void rigtig.offsetWidth; rigtig.classList.add("hint");
      later(() => rigtig.classList.remove("hint"), 2400);
    }
    rydValg();
    glideTilbage();
    try { Spil.sfx.wrong(); } catch (e) {}
    const nu = Date.now();
    if (nu - sidstFejl > 1300) {
      sidstFejl = nu;
      Spil.say("Nej, det skal et andet sted hen. Prøv igen!", null, "skrald-forkert");
    }
  }

  // Skraldet flyver i en bue hen til spanden og lander i den
  function putI(spand) {
    if (!stk || !stk.el || busy) return;
    busy = true;
    const el = stk.el, x0 = stk.x, y0 = stk.y;
    rydValg();
    el.classList.remove("loftet");
    el.style.pointerEvents = "none";
    el.style.transition = "none";
    const s = sbRect(), r = spand.getBoundingClientRect();
    const w = el.offsetWidth;
    const tx = r.left + r.width / 2 - s.left - w / 2;
    const ty = r.top + r.height / 2 - s.top - w / 2;
    const mx = (x0 + tx) / 2, my = Math.min(y0, ty) - Math.max(60, Math.abs(ty - y0) * .38);
    let landet = false;
    const land = () => { if (landet) return; landet = true; lande(el, spand); };
    const kf = [
      { transform: `translate(${x0}px,${y0}px) scale(1.05) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${mx}px,${my}px) scale(.94) rotate(10deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${tx}px,${ty}px) scale(.3) rotate(22deg)`, opacity: .2 }
    ];
    try {
      const an = el.animate(kf, { duration: still ? 140 : 440, easing: "cubic-bezier(.4,.05,.6,1)", fill: "forwards" });
      an.onfinish = land;
      an.oncancel = land;
    } catch (e) { land(); }
  }

  function lande(el, spand) {
    if (el && el.isConnected) el.remove();
    stk = null;
    if (!alive) return;
    spand.classList.remove("hop"); void spand.offsetWidth; spand.classList.add("hop");
    klonk();
    Spil.burstAt(spand, "⭐✨");
    const ros = ROS[Math.random() * ROS.length | 0];
    Spil.say(ros[0], null, ros[1]);
    taeller++;
    visTaeller();
    later(() => spand.classList.remove("hop"), 800);
    const faerdig = taeller >= 5;
    later(faerdig ? gadeFaerdig : naeste, faerdig ? 2000 : 1650);
  }

  /* ---------- Træk med fingeren (og tryk for de mindste) ---------- */
  function startTraek(e) {
    if (!alive || busy || !stk) return;
    if (e.pointerType === "mouse" && e.button > 0) return;
    const el = stk.el;
    if (!el || !el.isConnected) return;
    if (drag) { // en finger mere (eller en pointerup der blev væk): start forfra
      rydTraek();
      drag = null;
    }
    const r = el.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, flyttet: false,
      gx: e.clientX - r.left, gy: e.clientY - r.top, sb: sbRect() };
    // Hvis pointerup bliver væk (fx et tryk uden for vinduet), må skraldet ikke hænge fast
    drag.vagt = later(() => {
      if (!drag || drag.id !== e.pointerId) return;
      drag = null;
      if (stk && stk.el) { stk.el.classList.remove("loftet"); glideTilbage(); }
      spande.forEach(x => x.classList.remove("over"));
    }, 8000);
    el.style.transition = "none";
    el.classList.add("loftet");
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    try { e.preventDefault(); } catch (err) {}
  }

  function rydTraek() {
    if (drag && drag.vagt) clearTimeout(drag.vagt);
    spande.forEach(x => x.classList.remove("over"));
  }

  function flyt(e) {
    if (!drag || e.pointerId !== drag.id || !stk || !stk.el) return;
    if (e.pointerType === "mouse" && e.buttons === 0) { slip(e); return; }
    if (!drag.flyttet && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) {
      drag.flyttet = true;
      rydValg();
    }
    if (!drag.flyttet) return;
    stk.x = e.clientX - drag.gx - drag.sb.left;
    stk.y = e.clientY - drag.gy - drag.sb.top;
    stk.el.style.transform = `translate(${stk.x}px,${stk.y}px) scale(1.06) rotate(-3deg)`;
    const b = spandUnder(e.clientX, e.clientY, true);
    spande.forEach(x => x.classList.toggle("over", x === b));
    try { e.preventDefault(); } catch (err) {}
  }

  function slip(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    rydTraek();
    drag = null;
    const el = stk && stk.el;
    try { if (el) el.releasePointerCapture(e.pointerId); } catch (err) {}
    if (!el || !el.isConnected) return;
    if (!d.flyttet) { // et tryk: skraldet vælges, og stemmen siger hvad det er
      el.classList.remove("loftet");
      vaelg();
      return;
    }
    const b = spandUnder(e.clientX, e.clientY, false);
    if (!b) { glideTilbage(); return; }
    if (b.dataset.type === stk.slags) putI(b); else forkert(b);
  }

  function afbryd(e) {
    if (drag && drag.id === e.pointerId) {
      rydTraek();
      drag = null;
      glideTilbage();
    }
  }

  function vaelg() {
    if (!alive || busy || !stk || !stk.el) return;
    valgt = true;
    stk.el.classList.add("valgt");
    sigStk();
  }

  /* ---------- Spandene ---------- */
  function trykSpand(b) {
    if (!alive || busy || !stk) return;
    if (!valgt) { // de mindste trykker måske på spanden først: hør hvad spanden hedder
      const el = stk.el;
      if (el) { el.classList.remove("valgt"); void el.offsetWidth; el.classList.add("valgt"); }
      valgt = true;
      const nu = Date.now();
      if (nu - sidstFejl > 900) {
        sidstFejl = nu;
        const t = TYPER[b.dataset.type];
        Spil.say(t.navn.charAt(0).toUpperCase() + t.navn.slice(1) + "!", null, "skrald-navn-" + b.dataset.type);
      }
      return;
    }
    if (b.dataset.type === stk.slags) putI(b); else forkert(b);
  }

  /* ---------- Gaden, tømningen og bilen ---------- */
  function byggHuse(n) {
    const g = GADER[n % GADER.length];
    const scene = q(".sb-scene");
    scene.style.background = `linear-gradient(${g.himmel[0]},${g.himmel[1]} 58%,#f6fcff)`;
    const huse = q(".sb-huse");
    huse.innerHTML = "";
    g.huse.forEach(([hus, tag], i) => {
      const d = document.createElement("div");
      d.className = "sb-hus";
      d.style.setProperty("--hus", hus);
      d.style.setProperty("--tag", tag);
      d.style.setProperty("--f", (0.8 + ((i * 29) % 4) * .09).toFixed(2));
      d.innerHTML = `<i class="sb-hus-skorsten"></i><div class="sb-hus-tag"></div>
        <div class="sb-hus-krop"><i class="sb-vin"></i><i class="sb-vin"></i><i class="sb-vin"></i><i class="sb-doer"></i></div>`;
      huse.appendChild(d);
      if (i === 0 || i === 2) { // et træ efter første og tredje hus
        const t = document.createElement("div");
        t.className = "sb-tre " + g.trae;
        huse.appendChild(t);
      }
    });
  }

  function byggSpande() {
    const wrap = q(".sb-spande");
    wrap.innerHTML = "";
    spande = [];
    ["mad", "papir", "glas"].forEach(t => {
      const d = TYPER[t];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sb-spand" + (t === "glas" ? " skjult" : "");
      b.dataset.type = t;
      b.style.setProperty("--krop", d.krop);
      b.style.setProperty("--laag", d.laag);
      b.setAttribute("aria-label", "Spand til " + d.navn);
      b.innerHTML = `<span class="sb-laag"></span><span class="sb-krop"><span class="sb-ikon">${d.ikon}</span></span>`;
      b.addEventListener("click", () => trykSpand(b));
      wrap.appendChild(b);
      spande.push(b);
    });
  }

  // Fem stykker skrald: alle spandens slags er med, rækkefølgen er blandet.
  // I den første gade er det kun de nemmeste slags (og kun mad og papir).
  function nyKoe() {
    const typer = gadeNr === 0 ? ["mad", "papir"] : ["mad", "papir", "glas"];
    const pulje = Spil.shuffle(SKRALD.filter(s => typer.includes(s.t) && (gadeNr > 0 || s.nemt)));
    const k = [];
    typer.forEach(t => {
      const i = pulje.findIndex(s => s.t === t);
      if (i >= 0) k.push(pulje.splice(i, 1)[0]);
    });
    while (k.length < 5 && pulje.length) k.push(pulje.pop());
    Spil.shuffle(k);
    // to ens slags må ikke ligge lige efter hinanden, hvis det kan undgås
    for (let i = 1; i < k.length; i++) {
      if (k[i].t !== k[i - 1].t) continue;
      const j = k.findIndex((s, idx) => idx > i && s.t !== k[i - 1].t);
      if (j > i) { const tmp = k[i]; k[i] = k[j]; k[j] = tmp; }
    }
    return k;
  }

  function startGade() {
    taeller = 0; visTaeller();
    spande.forEach(b => b.classList.remove("tomt", "hop", "hint", "fejl", "toem", "over"));
    koe = nyKoe();
    ventIntro = true;
    later(naeste, gadeNr === 0 ? 900 : 1500);
    if (gadeNr === 0) Spil.say(HEJ, sigEfterIntro, "skrald-hej");
    else {
      const glas = spande.find(b => b.dataset.type === "glas");
      const nyGlas = glas.classList.contains("skjult");
      if (nyGlas) {
        glas.classList.remove("skjult");
        glas.classList.remove("ny"); void glas.offsetWidth; glas.classList.add("ny");
        later(() => glas.classList.remove("ny"), 1000);
      }
      const tekst = nyGlas ? "Se, en ny gade! Nu har vi også en spand til glas." : "Se, en ny gade!";
      const noegler = nyGlas ? ["skrald-ny-gade", "skrald-glas-kommer"] : ["skrald-ny-gade"];
      Spil.say(tekst, sigEfterIntro, noegler);
    }
    later(sigEfterIntro, 7000); // hvis introen bliver afbrudt
  }

  function gadeFaerdig() {
    if (!alive) return;
    busy = true; rydValg();
    faerdige++;
    Spil.say("Alle fem er på plads! Nu tømmer skraldebilen spandene.", null, "skrald-gade-klar");
    later(taem, 1600);
  }

  function taem() {
    if (!alive) return;
    bil.style.setProperty("--dx", "-16px"); // bilen bakker hen mod spandene
    bakkeBip();
    later(() => {
      if (!alive) return;
      const liste = spande.filter(b => !b.classList.contains("skjult"));
      let i = 0;
      const enSpand = () => {
        if (!alive) return;
        if (i >= liste.length) { kørVæk(); return; }
        tømSpand(liste[i++]);
        later(enSpand, 1800);
      };
      enSpand();
    }, 1100);
  }

  // Bilen kører hen til spanden, spanden løftes op og tippes, og skraldet knases
  function tømSpand(b) {
    const s = sbRect(), r = b.getBoundingClientRect(), bilW = bil.offsetWidth;
    const center = s.left + s.width / 2;
    const bag = center - bilW / 2 + bilW * .04; // bilens bagende (bagklappen)
    let dx = (r.left + r.width * .62) - bag; // bagenden holder lidt til højre for spandens midte
    const max = Math.max(0, s.width / 2 - bilW / 2 - 8);
    dx = Math.max(-max, Math.min(max, dx));
    bil.style.setProperty("--dx", dx.toFixed(1) + "px");
    motor(.7);
    later(() => {
      if (!alive) return;
      // spandens bund løftes op til bilens kasse, så den kan tippes ind bagi
      const br = bil.getBoundingClientRect();
      const loft = Math.max(48, r.bottom - (br.top + br.height * .7));
      b.style.setProperty("--loft", loft.toFixed(0) + "px");
      b.classList.remove("toem"); void b.offsetWidth; b.classList.add("toem");
      later(() => {
        if (!alive) return;
        knas();
        bil.classList.add("ryster");
        b.classList.add("tomt");
        Spil.burstAt(b, "💨✨");
      }, 560);
      later(() => {
        bil.classList.remove("ryster");
        b.classList.remove("toem");
      }, 1560);
    }, 320);
  }

  function kørVæk() {
    const festNu = faerdige % 3 === 0;
    if (festNu) later(fest, 300);
    const vent = festNu ? 3600 : 0; // bilen holder stille under festen
    bil.style.setProperty("--dx", "0px");
    later(() => {
      if (!alive) return;
      tut();
      motor(1.5);
      bil.classList.add("kører");
      bil.style.setProperty("--dx", (innerWidth + 700) + "px");
      Spil.burstAt(bil, "💨");
    }, 550 + vent);
    later(klarNyGade, 2600 + vent);
  }

  function klarNyGade() {
    if (!alive) return;
    gadeNr++;
    byggHuse(gadeNr);
    // bilen kører ind fra venstre igen
    bil.classList.remove("kører");
    bil.style.transition = "none";
    bil.style.setProperty("--dx", (-(innerWidth + 700)) + "px");
    void bil.offsetWidth;
    requestAnimationFrame(() => {
      if (!alive) return;
      bil.style.transition = "";
      bil.style.setProperty("--dx", "0px");
      motor(1.4);
    });
    spande.forEach(b => b.classList.remove("hop", "hint", "fejl", "toem", "over"));
    startGade();
  }

  function fest() {
    Spil.sfx.fanfare();
    Spil.say("Hurra! Du er en rigtig skraldehelt!", null, "skrald-fest");
    for (let i = 0; i < 8; i++) {
      later(() => Spil.burst(innerWidth * (.1 + Math.random() * .8), innerHeight * (.1 + Math.random() * .45),
        "🎉⭐✨💫🎊"), i * 240);
    }
    spande.forEach(b => later(() => Spil.burstAt(b, "🎉✨"), 300));
  }

  function placer() {
    if (!stk || !stk.el || drag) return;
    const p = pilePos();
    stk.x = p.x; stk.y = p.y;
    stk.el.style.transition = "none";
    stk.el.style.transform = `translate(${p.x}px,${p.y}px)`;
    bil.style.setProperty("--dx", "0px");
  }

  Spil.register({
    id: "skraldebilen", navn: "Skraldebilen", ikon: "🚛", farve: "#a8e6a3",
    start(r) {
      Spil.preload(["skrald-hej", "skrald-hvor", "skrald-forkert", "skrald-gade-klar",
        "skrald-ny-gade", "skrald-glas-kommer", "skrald-fest",
        ...SKRALD.map(s => s.k), ...Object.keys(TYPER).map(t => "skrald-navn-" + t), ...ROS.map(x => x[1])]);
      root = r; alive = true; timers = []; kilder = [];
      stk = null; drag = null; valgt = false; busy = false; koe = []; taeller = 0;
      gadeNr = 0; faerdige = 0; ventIntro = false; sidstFejl = 0;

      root.innerHTML = `<div class="sb">
        <button class="sb-sig" aria-label="Hør det igen">🔊</button>
        <div class="sb-taeller" aria-hidden="true">${"<span></span>".repeat(5)}</div>
        <div class="sb-scene">
          <div class="sb-sol"></div>
          <div class="sb-sky sb-sky-1"></div>
          <div class="sb-sky sb-sky-2"></div>
          <div class="sb-sky sb-sky-3"></div>
          <div class="sb-huse"></div>
          <div class="sb-fortov"></div>
          <div class="sb-vej"></div>
          <div class="sb-bil" aria-hidden="true">
            <div class="sb-bil-kasse"></div>
            <div class="sb-bil-laas"></div>
            <div class="sb-bil-kabine"></div>
            <div class="sb-bil-rude"></div>
            <div class="sb-bil-lygte"></div>
            <div class="sb-bil-blaalys"></div>
            <div class="sb-bil-hjul sb-hjul-a"></div>
            <div class="sb-bil-hjul sb-hjul-b"></div>
          </div>
          <div class="sb-bunke"></div>
        </div>
        <div class="sb-spande"></div>
      </div>`;
      sb = q(".sb"); bil = q(".sb-bil"); pile = q(".sb-bunke");
      // Hjulene ruller med bilen: hver gang --dx ændres, drejes de præcis så langt, som bilen flytter sig
      // (fremad = med uret, bakke = mod uret)
      let sidstDx = 0, rul = 0;
      rulObs = new MutationObserver(() => {
        const dx = parseFloat(bil.style.getPropertyValue("--dx")) || 0;
        if (dx === sidstDx) return;
        rul += (dx - sidstDx) / (Math.PI * .19 * bil.offsetWidth) * 360;
        sidstDx = dx;
        bil.style.setProperty("--rul", rul.toFixed(1) + "deg");
      });
      rulObs.observe(bil, { attributes: true, attributeFilter: ["style"] });
      byggSpande();
      byggHuse(0);
      visTaeller();
      // Dybe links til test: gade-1 … gade-3 starter i den gade, toem går lige til tømningen,
      // fest tømmer den tredje gade, så festen kommer med det samme.
      const dyb = Spil.dyb || "", m = /^gade-([1-9])$/.exec(dyb);
      if (m) { gadeNr = +m[1] - 1; byggHuse(gadeNr); }
      if (dyb === "fest") { gadeNr = 2; faerdige = 2; byggHuse(gadeNr); }
      q(".sb-sig").onclick = () => {
        if (stk && stk.el) sigStk();
        else Spil.say("Træk skraldet hen til den rigtige spand.", null, "skrald-hej");
      };
      addEventListener("pointermove", flyt);
      addEventListener("pointerup", slip);
      addEventListener("pointercancel", afbryd);
      addEventListener("resize", placer);
      if (dyb === "toem" || dyb === "fest") { // gaden er allerede sorteret
        if (gadeNr > 0) spande.find(b => b.dataset.type === "glas").classList.remove("skjult");
        taeller = 5; visTaeller(); busy = true;
        later(gadeFaerdig, 500);
      } else startGade();
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout); timers = [];
      drag = null; stk = null; valgt = false;
      stopLyd();
      removeEventListener("pointermove", flyt);
      removeEventListener("pointerup", slip);
      removeEventListener("pointercancel", afbryd);
      removeEventListener("resize", placer);
      if (rulObs) rulObs.disconnect();
    }
  });
})();
