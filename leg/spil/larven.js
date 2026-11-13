// Spil: Larven — en åben have, hvor barnet passer en lille larve.
// Æg -> larve: giv den mad, leg med den, og put den i seng, når den er træt.
// Hver morgen er larven vokset, og der er kommet noget nyt i haven (ny mad eller en ny ting at lege med).
// Efter 4 nætter bliver larven til en puppe, og ud kommer en sommerfugl, som barnet selv maler.
// Sommerfuglen flyver ud i haven og bliver der, og et nyt æg ligger på bladet. Alt gemmes i lk-larven.
// Ingen rigtige eller forkerte valg: boblen over larven viser bare, hvad den har lyst til.
// Æbler plukkes fra træet: tryk på et æble, så falder det ned, og larven kravler hen og spiser det.
(function () {
  const DAGE = 4;
  // 🍃 er "blade i vinden" (på iPad to blade med vindstreger), så bladet tegnes i stedet
  const BLAD_MAD = `<svg class="lv-bladmad" viewBox="0 0 100 100"><path d="M20 80 L8 92" stroke="#3f8a34" stroke-width="7" stroke-linecap="round"/>
    <path d="M20 80 C2 36 40 4 92 8 C96 60 64 98 20 80 Z" fill="#58bb42" stroke="#2c7228" stroke-width="5" stroke-linejoin="round"/>
    <path d="M22 78 Q52 50 80 22" fill="none" stroke="#2f7a2e" stroke-width="4" stroke-linecap="round" opacity=".6"/>
    <path d="M26 54 C20 40 30 24 42 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/></svg>`;
  const START_MAD = [{ key: "blad", emoji: "🍃", tegn: BLAD_MAD }]; // æblerne hænger i træet
  // Hvor æblerne hænger i trækronen (procent af kronen; holdt til venstre, så de er på skærmen på telefon)
  const AEBLE_PLADS = [[18, 52], [36, 40], [52, 62], [30, 76]];
  // Det, der dukker op om morgenen, i rækkefølge
  const NYT = [
    { type: "mad", key: "jordbaer", emoji: "🍓" },
    { type: "leg", key: "blomst" },
    { type: "leg", key: "vandpyt" },
    { type: "mad", key: "paere", emoji: "🍐" },
    { type: "leg", key: "gynge" },
    { type: "mad", key: "vandmelon", emoji: "🍉" },
    { type: "leg", key: "mariehoene" },
    { type: "mad", key: "blaabaer", emoji: "🫐" },
  ];
  const LARVEFARVER = ["#8fd16a", "#ffb84d", "#6cc4f0", "#ff9fd0", "#b48cf0", "#ffd84d"];
  const MALING = [
    { key: "roed", hex: "#ff5d5d" }, { key: "orange", hex: "#ffa04a" }, { key: "gul", hex: "#ffd84d" },
    { key: "groen", hex: "#7fd77a" }, { key: "blaa", hex: "#5aa8f5" }, { key: "lilla", hex: "#b48cf0" },
    { key: "lyseroed", hex: "#ff9fd0" },
  ];
  const PYNT_BLOMSTER = ["🌸", "🌼", "🌷", "🌻", "🌺"];
  // Bladet, larven sover på: spids for enden, midterribbe, sideribber og en lille stilk (viewBox 220×100)
  const BLAD_SVG = `<svg viewBox="0 0 220 100" preserveAspectRatio="none">
    <defs><linearGradient id="lv-blad-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdc68"/><stop offset="1" stop-color="#3a9440"/></linearGradient></defs>
    <path d="M2 74 Q8 66 16 64" fill="none" stroke="#3f8a34" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 64 C40 14 140 4 216 30 C168 92 60 104 14 64 Z" fill="url(#lv-blad-g)" stroke="#2f7a2e" stroke-width="3" stroke-linejoin="round"/>
    <g fill="none" stroke="#2f7a2e" stroke-linecap="round" opacity=".55">
      <path d="M16 64 Q110 52 208 32" stroke-width="3.5"/>
      <path d="M60 57 Q70 38 84 30 M104 49 Q116 32 132 24 M148 41 Q160 28 176 22 M60 57 Q76 70 92 76 M104 49 Q122 62 140 66 M148 41 Q164 50 178 52" stroke-width="2.2"/>
    </g>
  </svg>`;

  const T = {
    "larve-aeg": "Se, et lille æg på bladet! Tryk på det.",
    "larve-klaek": "En lille larve! Hej, larve!",
    "larve-hej-igen": "Hej igen! Jeg har savnet dig.",
    "larve-sulten": "Jeg er sulten! Giv mig noget mad.",
    "larve-mums-0": "Mums!",
    "larve-mums-1": "Hvor er det lækkert!",
    "larve-mums-2": "Mere, mere!",
    "larve-maet": "Puha, nu er jeg mæt! Skal vi lege?",
    "larve-nej-tak": "Nej tak, jeg er helt mæt.",
    "larve-kilder": "Hihi, det kilder!",
    "larve-sjovt-0": "Hihi, det er sjovt!",
    "larve-sjovt-1": "En gang til!",
    "larve-bold": "Bolden ruller!",
    "larve-dufter": "Den dufter dejligt!",
    "larve-plask": "Plask! Hihi!",
    "larve-gynge": "Vi gynger højt!",
    "larve-fang": "Fang mig, mariehøne!",
    "larve-traet": "Jeg er så træt. Tryk på månen, så sover jeg.",
    "larve-ikke-traet": "Jeg er slet ikke træt endnu!",
    "larve-godnat": "Godnat, lille larve.",
    "larve-godmorgen": "Godmorgen! Se, der er kommet noget nyt i haven!",
    "larve-ny-jordbaer": "Et jordbær!", "larve-ny-blomst": "En blomst!", "larve-ny-vandpyt": "En vandpyt!",
    "larve-ny-paere": "En pære!", "larve-ny-gynge": "En gynge!", "larve-ny-vandmelon": "En vandmelon!",
    "larve-ny-mariehoene": "En mariehøne!", "larve-ny-blaabaer": "Blåbær!",
    "larve-stor": "Jeg er blevet så stor! Nu skal jeg sove en lang, lang nat.",
    "larve-puppe": "Se, larven er blevet til en puppe! Tryk på puppen.",
    "larve-sommerfugl": "Se! Larven er blevet til en sommerfugl!",
    "larve-mal": "Vælg en farve, og mal vingerne!",
    "larve-flyv": "Tryk på den grønne knap, så flyver den ud i haven!",
    "larve-farvel": "Farvel, sommerfugl! Se, et nyt æg!",
    "farve-roed": "rød", "farve-orange": "orange", "farve-gul": "gul", "farve-groen": "grøn",
    "farve-blaa": "blå", "farve-lilla": "lilla", "farve-lyseroed": "lyserød",
  };

  /* ---------- Sommerfuglen (SVG, viewBox 0 0 200 160) ---------- */
  const VINGE_OP = "M100 72 C76 16 18 2 14 44 C10 80 66 90 100 80 Z";
  const VINGE_NED = "M100 84 C68 86 30 100 42 134 C54 160 92 132 100 92 Z";
  function sommerfuglSVG(f, cls = "") {
    const side = `<path class="lv-op" d="${VINGE_OP}" fill="${f.op}"/><path class="lv-ned" d="${VINGE_NED}" fill="${f.ned}"/>
      <circle class="lv-prik" cx="50" cy="42" r="13" fill="${f.prik}"/><circle class="lv-prik" cx="60" cy="118" r="9" fill="${f.prik}"/>`;
    return `<svg class="lv-fugl ${cls}" viewBox="0 0 200 160">
      <g class="lv-vinge v">${side}</g>
      <g class="lv-vinge h"><g transform="matrix(-1 0 0 1 200 0)">${side}</g></g>
      <path d="M98 40 C92 22 84 14 76 10 M102 40 C108 22 116 14 124 10" fill="none" stroke="#3b2f2f" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="76" cy="10" r="4.5" fill="#3b2f2f"/><circle cx="124" cy="10" r="4.5" fill="#3b2f2f"/>
      <ellipse cx="100" cy="88" rx="9" ry="46" fill="#4a3a3a"/>
      <circle cx="100" cy="42" r="12" fill="#4a3a3a"/>
      <circle cx="95" cy="40" r="3.4" fill="#fff"/><circle cx="105" cy="40" r="3.4" fill="#fff"/>
    </svg>`;
  }

  // Trækronen: en sky af runde blade-klumper med skygge forneden og lyse pletter foroven (viewBox 130×100)
  const KRONE_C = [[30, 55, 26], [55, 35, 28], [85, 32, 27], [108, 52, 22], [95, 70, 22], [62, 66, 26], [30, 72, 18], [18, 46, 15]];
  const KRONE_SVG = `<svg viewBox="0 0 130 100" preserveAspectRatio="none">
    <g fill="#469236">${KRONE_C.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 5}" r="${r}"/>`).join("")}</g>
    <g fill="#5cb447">${KRONE_C.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>
    <g fill="#7fcd60"><circle cx="50" cy="26" r="13"/><circle cx="82" cy="22" r="11"/><circle cx="24" cy="44" r="8"/><circle cx="104" cy="44" r="7"/></g>
  </svg>`;

  Spil.css("css-larven", `
    .lv{position:relative;height:100%;overflow:hidden;--k:min(15vw,11vh,96px);--led:clamp(30px,8vmin,72px);
      --jord:calc(var(--k) + 4vh + env(safe-area-inset-bottom,0px))}
    .lv-have{position:absolute;inset:0}
    .lv-himmel{position:absolute;inset:0;background:linear-gradient(180deg,#8fd3ff 0%,#c9ecff 55%,#e8f8ff 70%);transition:background 1.5s}
    .lv-sol{position:absolute;top:6vh;left:max(22%,100px);width:min(16vmin,130px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle,#fff6b0 0 40%,#ffd84d 41% 62%,transparent 64%);box-shadow:0 0 50px 10px #fff3a0;transition:opacity 1.2s,transform 1.5s}
    .lv-sky{position:absolute;height:min(9vmin,70px);aspect-ratio:2.6;border-radius:999px;background:#fff;opacity:.9;animation:lv-sky 60s linear infinite}
    .lv-sky::before{content:"";position:absolute;width:45%;aspect-ratio:1;border-radius:50%;background:#fff;left:18%;top:-40%}
    @keyframes lv-sky{from{transform:translateX(-30vw)}to{transform:translateX(120vw)}}
    .lv-bakke{position:absolute;left:-10%;right:-10%;bottom:0;height:calc(var(--jord) + 18vh);border-radius:50% 50% 0 0/22% 22% 0 0;
      background:linear-gradient(180deg,#9fdc7c,#79c35a 40%,#5fae47)}
    .lv-bakke2{position:absolute;left:30%;right:-30%;bottom:0;height:calc(var(--jord) + 24vh);border-radius:50% 50% 0 0/30% 30% 0 0;
      background:#b5e597;opacity:.7}
    .lv-greas{position:absolute;left:0;right:0;bottom:calc(var(--jord) - 6px);height:14px;
      background:radial-gradient(6px 12px at 6px 12px,#5fae47 98%,transparent) 0 0/14px 14px repeat-x;opacity:.8}

    /* Træet til højre med en gren (gynge og puppe hænger på grenen) */
    /* Stammen er aldrig så høj, at kronen ryger op under knapperne foroven (iPad liggende) */
    .lv-trae{position:absolute;right:2%;bottom:calc(var(--jord) - 4px);width:min(11vmin,90px);--kw:min(52vmin,420px);
      height:min(58%,calc((100% - var(--jord) - var(--kw) / 1.3 - 96px) / .88));border-radius:30% 30% 8% 8%/6% 6% 4% 4%;
      background:linear-gradient(90deg,#8a5a32,#a8713f 50%,#8a5a32);z-index:1}
    .lv-trae::before,.lv-trae::after{content:"";position:absolute;bottom:-2px;width:45%;height:12%;background:#93603a;border-radius:100% 0 0 0}
    .lv-trae::before{right:92%}.lv-trae::after{left:92%;border-radius:0 100% 0 0}
    .lv-krone{position:absolute;bottom:88%;left:50%;width:var(--kw);aspect-ratio:1.3;transform:translateX(-62%)}
    .lv-krone>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
    /* Æbler i trækronen: tryk, så falder de ned. Når larven er sulten, dingler de lidt. */
    .lv-aeble{position:absolute;width:min(10vmin,68px);aspect-ratio:1;translate:-50% -50%;display:grid;place-items:center;padding:0;background:none;
      font-size:min(7vmin,50px);line-height:1;cursor:pointer;transform-origin:50% 10%;transition:scale .5s cubic-bezier(.3,1.6,.5,1),opacity .4s;
      filter:drop-shadow(0 3px 2px rgba(0,0,0,.18))}
    .lv-aeble.vaek{scale:0;opacity:0;pointer-events:none}
    .lv-aeble.vip{animation:lv-vip .45s}
    .lv-have.sulten .lv-aeble:not(.vaek){animation:lv-dingel 1.4s ease-in-out infinite}
    .lv-have.sulten .lv-aeble:nth-child(2n){animation-delay:-.7s}
    @keyframes lv-dingel{0%,100%{rotate:-7deg}50%{rotate:7deg}}
    @keyframes lv-vip{25%{rotate:-14deg}75%{rotate:14deg}}
    @media (prefers-reduced-motion:reduce){.lv-have.sulten .lv-aeble:not(.vaek),.lv-aeble.vip{animation:none}}
    .lv-gren{position:absolute;top:30%;right:70%;width:min(34vw,300px);height:min(2.6vmin,22px);border-radius:999px;background:#9a6535;transform:rotate(-6deg);transform-origin:100% 50%}
    .lv-gynge{position:absolute;top:50%;left:22%;width:min(18vmin,150px);height:calc(var(--h,30vh));transform-origin:50% 0;cursor:pointer}
    .lv-gynge::before,.lv-gynge::after{content:"";position:absolute;top:0;bottom:12px;width:3px;background:#6b4a2b}
    .lv-gynge::before{left:8%}.lv-gynge::after{right:8%}
    .lv-gynge i{position:absolute;left:0;right:0;bottom:0;height:14px;border-radius:6px;background:#c98a4c;box-shadow:0 4px 0 #a06a38}
    .lv-gynge.svinger{animation:lv-sving 1.4s ease-in-out 3}
    @keyframes lv-sving{25%{transform:rotate(22deg)}75%{transform:rotate(-22deg)}}
    .lv-gynge .lv-larve{position:absolute;left:50%;bottom:10px}
    /* Puppen hænger i en silketråd yderst på grenen (fri af gyngens reb) og svajer lidt */
    .lv-puppe{position:absolute;top:60%;left:-3%;width:max(60px,min(9vmin,74px));aspect-ratio:.56;transform-origin:50% 0;cursor:pointer;
      padding-top:min(3vmin,24px);box-sizing:content-box;animation:lv-puppe-ind 1s ease-out,lv-puppe-svaj 3.2s ease-in-out 1s infinite}
    .lv-puppe::before{content:"";position:absolute;top:0;left:calc(50% - 1px);width:2px;height:min(3vmin,24px);background:#f4f1e6;opacity:.9}
    .lv-puppe>svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 2px rgba(0,0,0,.18))}
    @keyframes lv-puppe-svaj{0%,100%{rotate:-3deg}50%{rotate:3deg}}
    @media (prefers-reduced-motion:reduce){.lv-puppe{animation:none}}
    .lv-puppe.vrik{animation:lv-vrik .5s}
    @keyframes lv-vrik{25%{transform:rotate(12deg)}75%{transform:rotate(-12deg)}}
    @keyframes lv-puppe-ind{from{transform:scale(0)}}

    /* Bladet til venstre, hvor larven sover og ægget ligger */
    .lv-seng{position:absolute;left:max(10px,env(safe-area-inset-left,0px));bottom:calc(var(--jord) - 10px);width:min(30vmin,240px);aspect-ratio:2.2;z-index:1;
      transform:rotate(-4deg)}
    .lv-seng>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 0 rgba(0,0,0,.1))}
    .lv-aeg{position:absolute;left:52%;bottom:45%;width:max(28%,60px);aspect-ratio:.8;translate:-50% 0;border-radius:50% 50% 46% 46%/58% 58% 42% 42%;
      background:radial-gradient(circle at 35% 30%,#fff 0 18%,#fff8dc 19% 60%,#f0e2b0);box-shadow:0 4px 0 rgba(0,0,0,.12);cursor:pointer;z-index:2}
    .lv-aeg.vrik{animation:lv-vrik .45s}

    /* Ting i haven */
    .lv-ting{position:absolute;bottom:calc(var(--jord) - 4px);transform:translateX(-50%);line-height:1;cursor:pointer;z-index:2;
      filter:drop-shadow(0 4px 3px rgba(0,0,0,.18))}
    .lv-ting.ny{animation:lv-ny 1s ease-out 3}
    @keyframes lv-ny{40%{transform:translateX(-50%) scale(1.35) rotate(-6deg)}}
    .lv-bold{font-size:calc(var(--led)*1.1);transition:left 1.2s cubic-bezier(.2,.8,.3,1)}
    .lv-bold.ruller{animation:lv-rul 1.2s cubic-bezier(.2,.8,.3,1)}
    @keyframes lv-rul{to{rotate:var(--rot,360deg)}}
    .lv-blomst{font-size:calc(var(--led)*2.2)}
    .lv-pyt{width:calc(var(--led)*3.4);height:calc(var(--led)*.8);border-radius:50%;bottom:calc(var(--jord) - 14px);
      background:radial-gradient(ellipse at 40% 35%,#d5f1ff 0 15%,#7cc6f2 40%,#4ea6dc);box-shadow:inset 0 -5px 0 rgba(0,0,0,.1);z-index:1}
    .lv-pyt.plask{animation:lv-plask .5s}
    @keyframes lv-plask{50%{transform:translateX(-50%) scale(1.15,.8)}}
    .lv-mh{font-size:calc(var(--led)*.9);transition:left 2.2s ease-in-out}
    .lv-pynt{font-size:calc(var(--led)*1.2);z-index:1}
    .lv-mad{position:absolute;bottom:calc(var(--jord) - 2px);transform:translateX(-50%);font-size:calc(var(--led)*1.2);line-height:1;z-index:4;
      animation:lv-dryp .45s cubic-bezier(.3,1.5,.6,1);transition:scale .2s;pointer-events:none;filter:drop-shadow(0 3px 2px rgba(0,0,0,.2))}
    @keyframes lv-dryp{from{transform:translate(-50%,-60vh)}}
    .lv-bladmad{display:block;width:1.05em;height:1.05em}

    /* Larven: led i en række, hovedet til højre (vendes med scaleX) */
    .lv-larve{position:absolute;bottom:calc(var(--jord) - 2px);transform:translateX(-50%);z-index:3;cursor:pointer}
    .lv-have>.lv-larve{transition:left var(--tid,1s) linear}
    .lv-krop{display:flex;align-items:flex-end;--s:calc(var(--led) * var(--str,1))}
    .lv-krop.venstre{transform:scaleX(-1)}
    .lv-led{width:var(--s);aspect-ratio:1;border-radius:50%;margin-right:calc(var(--s) * -.28);background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.45) 0 18%,transparent 20%),var(--c);
      box-shadow:inset 0 calc(var(--s) * -.12) 0 rgba(0,0,0,.12);position:relative;animation:lv-aand 2.4s ease-in-out infinite;animation-delay:calc(var(--i) * .12s)}
    .lv-led:nth-child(even){background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.45) 0 18%,transparent 20%),var(--c2)}
    .lv-led::after{content:"";position:absolute;bottom:-8%;left:30%;width:16%;height:22%;border-radius:40%;background:#4a3a3a;opacity:.7}
    .lv-hoved{width:calc(var(--s)*1.32);aspect-ratio:1;border-radius:50%;position:relative;background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.45) 0 16%,transparent 18%),var(--c);
      box-shadow:inset 0 calc(var(--s) * -.14) 0 rgba(0,0,0,.12);margin-bottom:calc(var(--s) * .25)}
    .lv-hoved::before,.lv-hoved::after{content:"";position:absolute;top:-34%;width:7%;height:40%;background:#4a3a3a;border-radius:4px;transform-origin:50% 100%}
    .lv-hoved::before{left:30%;transform:rotate(-18deg)}
    .lv-hoved::after{left:58%;transform:rotate(14deg)}
    .lv-oeje{position:absolute;top:24%;width:26%;aspect-ratio:1;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08)}
    .lv-oeje.a{left:34%}.lv-oeje.b{left:62%}
    .lv-oeje::after{content:"";position:absolute;left:35%;top:30%;width:52%;aspect-ratio:1;border-radius:50%;background:#2c2c3a;transition:transform .2s}
    .lv-mund{position:absolute;left:52%;top:60%;width:30%;height:16%;border-radius:0 0 999px 999px;background:#c94f5c}
    .lv-kind{position:absolute;left:74%;top:52%;width:18%;aspect-ratio:1.4;border-radius:50%;background:#ff8fa3;opacity:.7}
    .lv-larve.kryb .lv-led{animation:lv-kryb .5s ease-in-out infinite;animation-delay:calc(var(--i) * -.08s)}
    @keyframes lv-kryb{50%{transform:translateY(-26%)}}
    @keyframes lv-aand{50%{transform:scale(1.04,.96)}}
    .lv-larve.spiser .lv-hoved{animation:lv-gnav .3s ease-in-out infinite}
    @keyframes lv-gnav{50%{transform:translateY(8%) rotate(8deg)}}
    .lv-larve.fniser .lv-krop{animation:lv-fnis .25s ease-in-out 4}
    @keyframes lv-fnis{50%{translate:0 -8%;rotate:-4deg}}
    .lv-larve.sover .lv-oeje{height:4px;top:36%;aspect-ratio:auto;background:#2c2c3a}
    .lv-larve.sover .lv-oeje::after{display:none}
    .lv-larve.sover .lv-mund{width:14%;left:58%;border-radius:50%}
    .lv-larve.lille .lv-krop{--str:.75}

    .lv-boble{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) scale(0);transform-origin:50% 120%;
      background:#fff;border-radius:999px;padding:.2em .35em;font-size:calc(var(--led)*.75);line-height:1;box-shadow:0 4px 0 rgba(0,0,0,.1);
      transition:transform .3s cubic-bezier(.3,1.5,.6,1);pointer-events:none;white-space:nowrap}
    .lv-boble::after{content:"";position:absolute;left:50%;top:100%;margin-left:-8px;border:8px solid transparent;border-top-color:#fff;border-bottom:0}
    .lv-boble.vis{transform:translateX(-50%) scale(1)}
    .lv-zzz{position:absolute;bottom:100%;left:60%;font-size:calc(var(--led)*.6);font-weight:800;color:#fff;opacity:0;pointer-events:none}
    .lv-larve.sover .lv-zzz{animation:lv-zzz 2.2s ease-out infinite}
    @keyframes lv-zzz{0%{opacity:0;transform:translate(0,0) scale(.6)}30%{opacity:1}100%{opacity:0;transform:translate(30px,-60px) scale(1.2)}}

    /* Nat */
    .lv-moerke{position:absolute;inset:0;background:linear-gradient(180deg,#0d1b4a,#24306e 60%,#2b2f5c);opacity:0;transition:opacity 1.5s;pointer-events:none;z-index:5;mix-blend-mode:multiply}
    .lv-have.nat .lv-moerke{opacity:.85}
    .lv-have.nat .lv-sol{opacity:0;transform:translateY(30vh)}
    .lv-nathimmel{position:absolute;inset:0 0 40% 0;z-index:6;opacity:0;pointer-events:none;transition:opacity 1.5s}
    .lv-have.nat .lv-nathimmel{opacity:1;pointer-events:auto}
    .lv-maane{position:absolute;top:7vh;left:max(20%,100px);width:min(14vmin,110px);aspect-ratio:1;border-radius:50%;box-shadow:inset -18px -6px 0 0 #fff4b0;transform:rotate(-20deg)}
    .lv-stjerne{position:absolute;padding:0;background:none;font-size:clamp(22px,4vmin,40px);line-height:1;width:clamp(44px,8vmin,70px);aspect-ratio:1;
      display:grid;place-items:center;color:#fff6b0;animation:lv-blink 2s ease-in-out infinite}
    .lv-stjerne.glimt{animation:lv-glimt .6s}
    @keyframes lv-blink{50%{opacity:.5;transform:scale(.85)}}
    @keyframes lv-glimt{50%{transform:scale(1.8) rotate(30deg)}}
    .lv-have.nat .lv-larve.sover{z-index:7}

    /* Sommerfugle i haven */
    .lv-flok .lv-fugl{position:absolute;width:clamp(56px,10vmin,96px);height:auto;transition:left 3.5s ease-in-out,top 3.5s ease-in-out;z-index:4;cursor:pointer}
    .lv-fugl .lv-vinge{transform-box:fill-box;animation:lv-flap .35s ease-in-out infinite alternate}
    .lv-fugl .lv-vinge.v{transform-origin:100% 50%}.lv-fugl .lv-vinge.h{transform-origin:0 50%}
    @keyframes lv-flap{to{transform:scaleX(.55)}}
    .lv-fugl.stor .lv-vinge{animation:none}
    .lv-fugl.stor.flyver .lv-vinge{animation:lv-flap .3s ease-in-out infinite alternate}

    /* Knapper: madkurv forneden, måne/sol og højttaler foroven */
    .lv-bar{position:absolute;left:0;right:0;bottom:0;z-index:8;display:flex;justify-content:center;align-items:center;gap:clamp(8px,2vw,22px);
      padding:1.4vh 16px calc(1.6vh + env(safe-area-inset-bottom,0px));min-height:calc(var(--k) + 3vh);box-sizing:border-box;
      background:linear-gradient(180deg,#c98a56 0 8px,#e2aa74 8px);border-top:5px solid #f2c999}
    /* Uden mad (æg, puppe) er der bare græs forneden i stedet for en tom hylde */
    .lv-bar:empty{background:linear-gradient(180deg,#5fae47,#4f9a3c);border-top-color:transparent}
    .lv-knap{width:var(--k);aspect-ratio:1;border-radius:clamp(16px,2.6vh,26px);background:var(--card);box-shadow:0 7px 0 rgba(110,60,20,.35);
      font-size:calc(var(--k)*.6);line-height:1;display:grid;place-items:center;padding:0;animation:lv-pop .35s backwards}
    .lv-knap:active{transform:scale(.92)}
    .lv-knap.ny{animation:lv-ny-knap 1s ease-in-out 3}
    @keyframes lv-ny-knap{50%{transform:scale(1.18);box-shadow:0 0 0 7px #ffe066,0 7px 0 rgba(110,60,20,.35)}}
    @keyframes lv-pop{from{transform:scale(.3);opacity:0}}
    .lv-rund{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));width:clamp(52px,8.5vh,78px);aspect-ratio:1;border-radius:50%;
      font-size:clamp(24px,4vh,38px);z-index:9;display:grid;place-items:center;padding:0}
    .lv-sig{right:max(16px,env(safe-area-inset-right,0px));background:var(--sun);box-shadow:0 6px 0 #d9a21a}
    .lv-nat-knap{right:calc(max(16px,env(safe-area-inset-right,0px)) + clamp(52px,8.5vh,78px) + 14px);background:#2b3a78;box-shadow:0 6px 0 #18224d}
    .lv-nat-knap.dag{background:#fff3c4;box-shadow:0 6px 0 #e3b630}
    .lv-nat-knap.puls{animation:lv-ny-knap 1.2s ease-in-out infinite}
    .lv-rund:active{transform:translateY(4px)}

    /* Mal sommerfuglen */
    .lv-mal{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;
      background:radial-gradient(90% 70% at 50% 40%,#f4fbff,#c9ecff);padding:calc(2vh + clamp(52px,8.5vh,78px)) 16px calc(2vh + env(safe-area-inset-bottom,0px))}
    .lv-mal .lv-fugl{width:min(84vw,58vh,560px);height:auto;flex:none}
    .lv-mal .lv-fugl path,.lv-mal .lv-fugl circle.lv-prik{cursor:pointer;stroke:#4a3a3a;stroke-width:2.5;transition:fill .25s}
    .lv-mal .lv-fugl .lv-vinge{animation:none}
    .lv-mal.flyv .lv-fugl{transition:transform 1.6s ease-in,opacity 1.6s;transform:translate(30vw,-60vh) scale(.2) rotate(20deg);opacity:0}
    .lv-mal.flyv .lv-fugl .lv-vinge{animation:lv-flap .25s ease-in-out infinite alternate}
    .lv-potter{--pw:clamp(60px,min(10vw,9vh),82px);--pg:clamp(8px,1.8vw,18px);display:flex;flex-wrap:wrap;justify-content:center;gap:var(--pg);max-width:100%}
    /* Højkant: to pæne rækker (4 + 3) med store potter i stedet for 6 + 1 små */
    @media (max-aspect-ratio:1/1){.lv-potter{--pw:clamp(60px,17vw,82px);--pg:14px;max-width:calc(4 * var(--pw) + 3 * var(--pg))}}
    .lv-potte{width:var(--pw);aspect-ratio:1;border-radius:50%;padding:0;background:var(--c);
      box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 5px 0 rgba(31,58,95,.25);transition:transform .15s}
    .lv-potte.valgt{transform:translateY(-8px) scale(1.12);box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 0 0 5px #fff,0 0 0 9px var(--c)}
    .lv-faerdig{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(3vh + env(safe-area-inset-bottom,0px));
      width:clamp(64px,11vh,100px);aspect-ratio:1;border-radius:50%;background:#5cc46a;box-shadow:0 7px 0 #3d9a4b;font-size:clamp(30px,5.5vh,50px);padding:0;
      display:grid;place-items:center;opacity:.35;transition:opacity .3s}
    .lv-faerdig.klar{opacity:1;animation:lv-ny-knap 1.2s ease-in-out infinite}
    @media (max-aspect-ratio:1/1){.lv-faerdig{position:static}}

    @media (prefers-reduced-motion:reduce){
      .lv-sky,.lv-led,.lv-larve.kryb .lv-led,.lv-fugl .lv-vinge,.lv-stjerne,.lv-ting.ny,.lv-knap.ny,.lv-nat-knap.puls,
      .lv-faerdig.klar,.lv-gynge.svinger,.lv-larve.sover .lv-zzz,.lv-larve.fniser .lv-krop,.lv-larve.spiser .lv-hoved,.lv-mad{animation:none}
      .lv-have>.lv-larve,.lv-flok .lv-fugl,.lv-bold,.lv-mh{transition:none}
    }
  `);

  let dybTest = false;
  let root, alive, timers, tilstand, larve, behov, spist, leget, travl, koe, kropTimer, flokTimer, idleTimer, natTok, faseTok;
  const later = (fn, ms) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const q = sel => root.querySelector(sel);
  const pick = a => a[Math.random() * a.length | 0];
  const sig = (keys, done) => Spil.say(keys.map(k => T[k] || "").join(" "), done, keys);
  // Småreplikker ("Mums!", "Hihi!") afbryder ikke en vigtig replik, der allerede tales (fx "Tryk på månen")
  const smaasig = key => { if (!Spil.isTalking()) sig([key]); };
  // Bland en hex-farve med hvid
  const lys = (hex, a) => "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.substr(i, 2), 16) * (1 - a) + 255 * a).toString(16).padStart(2, "0")).join("");

  /* ---------- Gemt tilstand ---------- */
  function hent() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem("lk-larven")); } catch (e) {}
    return Object.assign({ fase: "aeg", dag: 1, farve: LARVEFARVER[0], nye: 0, fugle: [], boldX: .42 }, s || {});
  }
  function gem() { if (dybTest) return; try { localStorage.setItem("lk-larven", JSON.stringify(tilstand)); } catch (e) {} }

  // Dybt link til test (Spil.dyb). Gemmes ikke, så barnets rigtige larve ikke ændres.
  // "aeg", "dag-1" … "dag-4" (larven den dag med de ting, der er låst op), "alt" (alt i haven + pynt og sommerfugle),
  // "traet" (larven er mæt og træt), "nat", "puppe", "mal", "flok" (haven med sommerfugle).
  const DYB_FUGLE = [{ op: "#ff9fd0", ned: "#b48cf0", prik: "#ffd84d" }, { op: "#ffa04a", ned: "#ffd84d", prik: "#ff5d5d" },
    { op: "#5aa8f5", ned: "#7fd77a", prik: "#ffffff" }];
  function dybTilstand(d) {
    const m = d.match(/^dag-([1-4])$/);
    const s = { fase: "larve", dag: 1, farve: LARVEFARVER[0], nye: 0, fugle: [], boldX: .42 };
    if (m) { s.dag = +m[1]; s.nye = s.dag - 1; }
    else if (d === "aeg") s.fase = "aeg";
    else if (d === "traet" || d === "nat") { s.dag = 2; s.nye = 1; }
    else if (d === "alt") { s.dag = 4; s.nye = NYT.length + 4; s.fugle = DYB_FUGLE; }
    else if (d === "flok") { s.fase = "aeg"; s.fugle = DYB_FUGLE; }
    else if (d === "puppe" || d === "mal") { s.fase = "puppe"; s.dag = DAGE; s.nye = NYT.length; }
    else return null;
    return s;
  }
  function dybEfterStart(d) {
    if (d === "mal") { q(".lv-gren .lv-puppe")?.remove(); Spil.stopTalking(); mal(); return; }
    if (d === "traet" || d === "nat") {
      spist = 3; leget = 3; opdaterBehov();
      if (d === "nat") later(natKnap, 300);
    }
  }
  const laast = () => NYT.slice(0, tilstand.nye);
  const harTing = key => laast().some(n => n.key === key);

  /* ---------- Haven ---------- */
  const W = () => q(".lv-have").clientWidth;
  function bygHave() {
    root.innerHTML = `<div class="lv"><div class="lv-have">
      <div class="lv-himmel"></div><div class="lv-sol"></div>
      <div class="lv-sky" style="top:9vh;animation-delay:-12s"></div><div class="lv-sky" style="top:18vh;animation-delay:-41s;transform:scale(.7)"></div>
      <div class="lv-bakke2"></div><div class="lv-bakke"></div><div class="lv-greas"></div>
      <div class="lv-trae"><div class="lv-krone">${KRONE_SVG}</div><div class="lv-gren"></div></div>
      <div class="lv-seng"></div>
      <div class="lv-ting-lag"></div>
      <div class="lv-flok"></div>
      <div class="lv-moerke"></div>
      <div class="lv-nathimmel"><div class="lv-maane"></div></div>
    </div>
    <div class="lv-bar"></div>
    <button class="lv-rund lv-nat-knap" aria-label="Sov">🌙</button>
    <button class="lv-rund lv-sig" aria-label="Sig det igen">🔊</button></div>`;
    // Stjerner, man kan trykke på om natten
    const nh = q(".lv-nathimmel");
    // Stjerner, der ville ligge under en knap, månen eller trækronen, skjules (se placerStjerner)
    [[.08, .18], [.36, .1], [.5, .3], [.62, .12], [.78, .26], [.14, .5], [.44, .58], [.7, .48], [.9, .1],
      [.3, .34], [.58, .7], [.06, .72], [.2, .82], [.84, .16]].forEach(([x, y], i) => {
      const b = document.createElement("button");
      b.className = "lv-stjerne"; b.textContent = "⭐"; b.setAttribute("aria-label", "Stjerne");
      b.style.left = x * 100 + "%"; b.style.top = y * 100 + "%"; b.style.animationDelay = (i * .3) + "s";
      b.onclick = () => { b.classList.remove("glimt"); void b.offsetWidth; b.classList.add("glimt"); Spil.tone([[784, 880, 988, 1175, 1319][i % 5]], .25); };
      nh.appendChild(b);
    });
    placerStjerner();
    q(".lv-sig").onclick = () => siBehov(true);
    tegnAebler();
    q(".lv-have").onclick = e => {
      if (!larve || travl || tilstand.fase !== "larve" || q(".lv-have").classList.contains("nat")) return;
      const hr = q(".lv-have").getBoundingClientRect();
      if (e.clientY < hr.top + hr.height * .45) return; // kun på græsset
      nulstilIdle(); travl = true; boble(null);
      kryb((e.clientX - hr.left) / hr.width, () => { travl = false; opdaterBehov(); naeste(); });
    };
    q(".lv-nat-knap").onclick = natKnap;
    tegnTing();
    tegnFlok();
    q(".lv-seng").innerHTML = BLAD_SVG;
  }

  function placerStjerner() {
    const hind = [...root.querySelectorAll(".lv-rund,.lv-krone,.lv-maane"), document.getElementById("home")]
      .filter(Boolean).map(e => e.getBoundingClientRect());
    root.querySelectorAll(".lv-stjerne").forEach(b => {
      const r = b.getBoundingClientRect();
      const ramt = hind.some(h => r.left < h.right + 6 && r.right > h.left - 6 && r.top < h.bottom + 6 && r.bottom > h.top - 6);
      b.style.visibility = ramt ? "hidden" : "";
    });
  }

  function tegnTing(ny) {
    const lag = q(".lv-ting-lag");
    lag.innerHTML = "";
    const add = (cls, html, x, fn, key) => {
      const d = document.createElement("div");
      d.className = "lv-ting " + cls + (key && key === ny ? " ny" : "");
      d.innerHTML = html; d.style.left = x * 100 + "%";
      if (fn) d.onclick = e => { e.stopPropagation(); fn(d); };
      lag.appendChild(d);
      return d;
    };
    add("lv-bold", "⚽", tilstand.boldX, d => oensk({ type: "bold", el: d }), "bold");
    if (harTing("blomst")) add("lv-blomst", "🌷", .27, d => oensk({ type: "blomst", el: d }), "blomst");
    if (harTing("vandpyt")) add("lv-pyt", "", .6, d => oensk({ type: "pyt", el: d }), "vandpyt");
    if (harTing("mariehoene")) add("lv-mh", "🐞", .5, d => oensk({ type: "mh", el: d }), "mariehoene");
    // Pynteblomster, når alle nye ting er kommet
    const ekstra = Math.max(0, tilstand.nye - NYT.length);
    for (let i = 0; i < Math.min(ekstra, 6); i++)
      add("lv-pynt", PYNT_BLOMSTER[i % PYNT_BLOMSTER.length], .18 + i * .11, d => { Spil.burstAt(d, "🌸✨🌼"); Spil.sfx.pop(); }, i === ekstra - 1 ? ny : "");
    // Gyngen hænger i træets gren
    const gren = q(".lv-gren");
    gren.querySelector(".lv-gynge")?.remove();
    if (harTing("gynge")) {
      const g = document.createElement("div");
      g.className = "lv-gynge" + (ny === "gynge" ? " ny" : "");
      g.innerHTML = "<i></i>";
      g.onclick = e => { e.stopPropagation(); oensk({ type: "gynge", el: g }); };
      gren.appendChild(g);
      maalGynge();
    }
    tegnBar(ny);
  }
  // Gyngens reb skal nå ned til græsset
  function maalGynge() {
    const g = q(".lv-gynge"); if (!g) return;
    // Sædet skal hænge lige over græsset (lige over madhylden)
    const gr = q(".lv-gren").getBoundingClientRect(), jord = q(".lv-bar").getBoundingClientRect().top - 24;
    g.style.setProperty("--h", Math.max(80, jord - (gr.top + gr.height / 2)) + "px");
  }

  function tegnBar(ny) {
    const bar = q(".lv-bar");
    bar.innerHTML = "";
    if (tilstand.fase !== "larve") return;
    const mad = START_MAD.concat(laast().filter(n => n.type === "mad"));
    mad.slice(-5).forEach((m, i) => {
      const b = document.createElement("button");
      b.className = "lv-knap" + (m.key === ny ? " ny" : "");
      b.style.animationDelay = (i * .05) + "s";
      if (m.tegn) b.innerHTML = m.tegn; else b.textContent = m.emoji;
      b.setAttribute("aria-label", "Mad");
      b.onclick = () => giMad(m);
      bar.appendChild(b);
    });
  }

  /* ---------- Sommerfuglene i haven ---------- */
  function tegnFlok() {
    const f = q(".lv-flok");
    f.innerHTML = tilstand.fugle.slice(-8).map(c => sommerfuglSVG(c)).join("");
    [...f.children].forEach(el => {
      flyt(el, true);
      el.onclick = e => { e.stopPropagation(); flyt(el); Spil.tone([1047, 1319], .1); };
    });
  }
  function flyt(el, straks) {
    if (straks) el.style.transition = "none";
    el.style.left = (5 + Math.random() * 78) + "%";
    el.style.top = (8 + Math.random() * 38) + "%";
    if (straks) { void el.offsetWidth; el.style.transition = ""; }
  }

  /* ---------- Larven ---------- */
  function lavLarve(sted) {
    const n = 2 + Math.min(tilstand.dag, DAGE + 1); // led uden hovedet: vokser hver dag
    const c = tilstand.farve;
    const d = document.createElement("div");
    d.className = "lv-larve";
    const led = Array.from({ length: n }, (_, i) => `<span class="lv-led" style="--i:${n - i}"></span>`).join("");
    d.innerHTML = `<div class="lv-boble"></div><div class="lv-zzz">z</div>
      <div class="lv-krop" style="--c:${c};--c2:${lys(c, .22)};--str:${(.8 + tilstand.dag * .06).toFixed(2)}">
        ${led}<span class="lv-hoved"><i class="lv-oeje a"></i><i class="lv-oeje b"></i><i class="lv-mund"></i><i class="lv-kind"></i></span></div>`;
    d.onclick = e => { e.stopPropagation(); kild(); };
    (sted || q(".lv-have")).appendChild(d);
    return d;
  }
  const larveX = () => parseFloat(larve.style.left) / 100;
  const larveBredde = () => larve.getBoundingClientRect().width / W();
  function vend(retning) { larve.querySelector(".lv-krop").classList.toggle("venstre", retning < 0); }

  // Kryb hen til x (andel af bredden), så hovedet ender ved x
  function kryb(x, saa) {
    const L = larveBredde(), fra = larveX();
    const dir = x >= fra ? 1 : -1;
    let maal = x - dir * L * .42;
    maal = Math.max(L / 2 + .02, Math.min(.86 - L / 2, maal));
    vend(dir);
    const px = Math.abs(maal - fra) * W(), tid = Math.max(.25, px / 140);
    if (px < 6) { saa && later(saa, 50); return; }
    larve.style.setProperty("--tid", tid + "s");
    larve.classList.add("kryb");
    larve.style.left = maal * 100 + "%";
    later(() => { larve.classList.remove("kryb"); vend(dir); saa && saa(); }, tid * 1000 + 30);
  }

  function boble(emoji) {
    const b = larve && larve.querySelector(".lv-boble");
    if (!b) return;
    if (emoji) { b.textContent = emoji; b.classList.add("vis"); } else b.classList.remove("vis");
  }
  function opdaterBehov(snak) {
    behov = spist < 3 ? "sulten" : leget < 3 ? "leg" : "traet";
    boble(travl ? null : { sulten: "🍎", leg: "⚽", traet: "💤" }[behov]);
    q(".lv-nat-knap").classList.toggle("puls", behov === "traet");
    q(".lv-have").classList.toggle("sulten", behov === "sulten" && tilstand.fase === "larve"); // æblerne dingler
    if (snak) siBehov();
  }
  function siBehov(altid) {
    if (!alive) return;
    if (tilstand.fase === "aeg") return sig(["larve-aeg"]);
    if (tilstand.fase === "puppe") return sig(["larve-puppe"]);
    if (tilstand.fase === "mal") return sig(["larve-mal"]);
    if (!altid && Spil.isTalking()) return;
    if (q(".lv-have").classList.contains("nat")) return;
    sig([{ sulten: "larve-sulten", leg: "larve-maet", traet: "larve-traet" }[behov]]);
  }
  function nulstilIdle() {
    clearTimeout(idleTimer);
    idleTimer = later(() => { if (!travl) siBehov(); nulstilIdle(); }, 15000);
  }

  // Ønsker samles i en kø, så larven gør dem én ad gangen
  function oensk(o) {
    if (!alive || tilstand.fase !== "larve" || q(".lv-have").classList.contains("nat")) return;
    nulstilIdle();
    if (o.type !== "mad" && koe.some(k => k.type === o.type)) return;
    if (koe.length < 4) koe.push(o);
    if (!travl) naeste();
  }
  function naeste() {
    if (!alive || travl) return;
    const o = koe.shift();
    if (!o) { opdaterBehov(); return; }
    travl = true; boble(null);
    const faerdig = () => { travl = false; later(naeste, 250); };
    ({ mad: spis, bold: legBold, blomst: lugt, pyt: plask, gynge: gyng, mh: fang })[o.type](o, faerdig);
  }

  /* ---------- Æbletræet ---------- */
  function tegnAebler() {
    const k = q(".lv-krone");
    AEBLE_PLADS.forEach(([x, y]) => {
      const b = document.createElement("button");
      b.className = "lv-aeble"; b.textContent = "🍎"; b.setAttribute("aria-label", "Æble");
      b.style.left = x + "%"; b.style.top = y + "%";
      b.onclick = e => { e.stopPropagation(); plukAeble(b); };
      k.appendChild(b);
    });
  }

  // Æblet falder ned på græsset, og larven kravler hen og spiser det. Et nyt æble gror frem efter lidt tid.
  function plukAeble(b) {
    if (!alive || b.classList.contains("vaek")) return;
    const have = q(".lv-have");
    const kan = larve && tilstand.fase === "larve" && !have.classList.contains("nat") && root.querySelectorAll(".lv-mad").length < 4;
    if (!kan) { b.classList.remove("vip"); void b.offsetWidth; b.classList.add("vip"); Spil.tone([520, 440], .08, "triangle"); return; }
    const hr = have.getBoundingClientRect(), ar = b.getBoundingClientRect();
    const ax = (ar.left + ar.width / 2 - hr.left) / hr.width;
    const x = Math.max(.12, Math.min(.8, ax)); // så larvens hoved kan nå det
    b.classList.add("vaek");
    Spil.tone([700, 560], .07, "sine");
    const el = document.createElement("div");
    el.className = "lv-mad"; el.textContent = "🍎";
    el.style.left = x * 100 + "%";
    q(".lv-ting-lag").appendChild(el);
    const er = el.getBoundingClientRect();
    const dx = ar.left + ar.width / 2 - (er.left + er.width / 2), dy = ar.top + ar.height / 2 - (er.top + er.height / 2);
    const T = (px, py, r = 0) => `translate(calc(-50% + ${px}px),${py}px) rotate(${r}deg)`;
    el.animate([
      { transform: T(dx, dy), easing: "cubic-bezier(.5,0,1,1)" },
      { transform: T(0, 0, 300), offset: .72, easing: "ease-out" },
      { transform: T(0, -18, 340), offset: .86, easing: "ease-in" },
      { transform: T(0, 0, 360) }
    ], { duration: 750 });
    later(() => { Spil.tone([180, 110], .07, "sine"); }, 540); // bump i græsset
    later(() => oensk({ type: "mad", el, x }), 650);
    later(() => b.classList.remove("vaek"), 8000);
  }

  function giMad(m) {
    if (!alive || tilstand.fase !== "larve" || q(".lv-have").classList.contains("nat")) return;
    if (root.querySelectorAll(".lv-mad").length >= 4) return;
    Spil.sfx.click();
    const el = document.createElement("div");
    el.className = "lv-mad";
    if (m.tegn) el.innerHTML = m.tegn; else el.textContent = m.emoji;
    // Læg maden lidt væk fra larven, så den skal kravle hen til den
    const lx = larveX(); let x;
    do { x = .2 + Math.random() * .58; } while (Math.abs(x - lx) < .15);
    el.style.left = x * 100 + "%";
    q(".lv-ting-lag").appendChild(el);
    oensk({ type: "mad", el, x });
  }

  function spis(o, faerdig) {
    if (spist >= 5) {
      // Helt mæt: rysten på hovedet, og maden forsvinder
      larve.classList.add("fniser");
      sig(["larve-nej-tak"]);
      later(() => { larve.classList.remove("fniser"); o.el.style.scale = "0"; }, 1100);
      later(() => { o.el.remove(); faerdig(); }, 1400);
      return;
    }
    kryb(o.x, () => {
      larve.classList.add("spiser");
      [.72, .45, .18].forEach((s, i) => later(() => {
        o.el.style.scale = s; Spil.tone([300 - i * 30, 220], .06, "square");
      }, 300 + i * 380));
      later(() => {
        o.el.remove(); larve.classList.remove("spiser");
        spist++;
        Spil.burstAt(larve.querySelector(".lv-hoved"), "✨💛✨");
        if (spist === 3) { sig(["larve-maet"]); Spil.sfx.right(); }
        else smaasig("larve-mums-" + (Math.random() * 3 | 0));
        later(faerdig, 500);
      }, 1500);
    });
  }

  function legetMed(linje) {
    leget++;
    if (leget === 3 && spist >= 3) { sig([linje]); later(() => { opdaterBehov(); sig(["larve-traet"]); }, 1800); }
    else smaasig(linje);
  }

  function legBold(o, faerdig) {
    const bx = parseFloat(o.el.style.left) / 100;
    kryb(bx, () => {
      // Larven skubber bolden et stykke væk
      const dir = bx > larveX() ? 1 : -1;
      let nx = bx + dir * (.18 + Math.random() * .2);
      if (nx > .78 || nx < .18) nx = bx - dir * (.18 + Math.random() * .15);
      nx = Math.max(.16, Math.min(.78, nx));
      o.el.style.setProperty("--rot", (nx > bx ? 540 : -540) + "deg");
      o.el.classList.remove("ruller"); void o.el.offsetWidth; o.el.classList.add("ruller");
      o.el.style.left = nx * 100 + "%";
      tilstand.boldX = nx; gem();
      Spil.tone([392, 523, 659], .08);
      legetMed(pick(["larve-bold", "larve-sjovt-0", "larve-sjovt-1"]));
      later(faerdig, 1300);
    });
  }
  function lugt(o, faerdig) {
    kryb(.27, () => {
      Spil.burstAt(o.el, "🌸✨🌸✨🌸");
      Spil.tone([659, 784, 1047], .12);
      legetMed("larve-dufter");
      later(faerdig, 1500);
    });
  }
  function plask(o, faerdig) {
    kryb(.6, () => {
      o.el.classList.remove("plask"); void o.el.offsetWidth; o.el.classList.add("plask");
      Spil.burstAt(o.el, "💧💦💧💦💧");
      Spil.tone([900, 600, 1200, 500], .05, "triangle");
      legetMed("larve-plask");
      later(faerdig, 1300);
    });
  }
  function gyng(o, faerdig) {
    const r = o.el.getBoundingClientRect(), have = q(".lv-have").getBoundingClientRect();
    kryb((r.left + r.width / 2 - have.left) / have.width, () => {
      // Larven hopper op på gyngen, gynger tre gange og hopper ned igen
      larve.style.visibility = "hidden";
      const lille = lavLarve(o.el);
      lille.classList.add("lille"); lille.style.left = "50%";
      lille.onclick = null;
      o.el.classList.add("svinger");
      Spil.tone([523, 659, 784, 659, 523], .18);
      legetMed("larve-gynge");
      later(() => { o.el.classList.remove("svinger"); lille.remove(); larve.style.visibility = ""; faerdig(); }, 4300);
    });
  }
  function fang(o, faerdig) {
    const mx = parseFloat(o.el.style.left) / 100;
    kryb(mx, () => {
      // Mariehønen smutter et andet sted hen
      let nx; do { nx = .18 + Math.random() * .6; } while (Math.abs(nx - mx) < .2);
      o.el.style.left = nx * 100 + "%";
      Spil.tone([1175, 1397, 1568], .07);
      legetMed("larve-fang");
      later(faerdig, 900);
    });
  }
  function kild() {
    if (!alive || tilstand.fase !== "larve" || q(".lv-have").classList.contains("nat")) return;
    nulstilIdle();
    if (larve.classList.contains("kryb")) return;
    larve.classList.remove("fniser"); void larve.offsetWidth; larve.classList.add("fniser");
    Spil.tone([880, 990, 880, 1100], .07);
    if (!travl && leget < 3) { leget++; if (leget === 3 && spist >= 3) { opdaterBehov(); sig(["larve-kilder", "larve-traet"]); return; } }
    smaasig("larve-kilder");
    later(() => larve.classList.remove("fniser"), 1100);
  }

  /* ---------- Nat og morgen ---------- */
  function natKnap() {
    if (!alive) return;
    const have = q(".lv-have");
    if (have.classList.contains("nat")) { if (q(".lv-nat-knap").classList.contains("dag")) morgen(); return; }
    if (tilstand.fase !== "larve" || travl) return;
    if (behov !== "traet") { Spil.sfx.wrong(); sig(["larve-ikke-traet"]); return; }
    travl = true; boble(null); koe = [];
    root.querySelectorAll(".lv-mad").forEach(m => m.remove());
    q(".lv-nat-knap").classList.remove("puls");
    // Larven kravler hen på bladet og lægger sig
    const seng = q(".lv-seng").getBoundingClientRect(), hr = q(".lv-have").getBoundingClientRect();
    kryb((seng.left + seng.width * .75 - hr.left) / hr.width, () => {
      vend(1);
      larve.classList.add("sover");
      have.classList.add("nat");
      q(".lv-nat-knap").textContent = "☀️";
      q(".lv-nat-knap").setAttribute("aria-label", "Vågn op");
      Spil.tone([523, 440, 392, 330, 294], .35);
      sig(["larve-godnat"]);
      const tok = ++natTok;
      later(() => { if (tok === natTok) q(".lv-nat-knap").classList.add("dag"); }, 1500);
      later(() => { if (tok === natTok && have.classList.contains("nat")) morgen(); }, 11000);
    });
  }

  function morgen() {
    if (!alive) return;
    natTok++;
    const have = q(".lv-have");
    have.classList.remove("nat");
    const knap = q(".lv-nat-knap");
    knap.textContent = "🌙"; knap.classList.remove("dag"); knap.setAttribute("aria-label", "Sov");
    Spil.tone([392, 523, 659, 784], .16);

    if (tilstand.fase === "puppe") { later(() => sig(["larve-puppe"]), 800); return; }

    // Larven er vokset, og der er kommet noget nyt
    tilstand.dag++;
    if (tilstand.dag > DAGE) { blivPuppe(); return; }
    const ny = tilstand.nye < NYT.length ? NYT[tilstand.nye].key : "pynt";
    tilstand.nye++;
    gem();
    nyLarve();
    larve.classList.add("sover");
    tegnTing(ny);
    later(() => {
      larve.classList.remove("sover");
      Spil.burstAt(larve, "✨⭐✨⭐✨");
      const nyKey = ny === "pynt" ? "larve-ny-blomst" : "larve-ny-" + ny;
      const el = q(".lv-ting.ny") || q(".lv-knap.ny");
      if (el) Spil.burstAt(el, "✨⭐🌟⭐✨");
      sig(["larve-godmorgen", nyKey], () => later(() => opdaterBehov(true), 600));
      nyDag();
    }, 1300);
  }

  function nyDag() { spist = 0; leget = 0; travl = false; koe = []; opdaterBehov(); nulstilIdle(); }

  function nyLarve(x) {
    const gl = larve ? larve.style.left : null;
    larve?.remove();
    larve = lavLarve();
    const seng = q(".lv-seng").getBoundingClientRect(), hr = q(".lv-have").getBoundingClientRect();
    larve.style.left = x != null ? x * 100 + "%" : gl || ((seng.left + seng.width * .6 - hr.left) / hr.width * 100) + "%";
  }

  /* ---------- Puppe og sommerfugl ---------- */
  function blivPuppe() {
    tilstand.dag = DAGE; gem();
    nyLarve();
    tegnBar();
    travl = true;
    later(() => sig(["larve-stor"]), 900);
    // Larven kravler hen til træet og bliver til en puppe på grenen
    later(() => {
      const tr = q(".lv-trae").getBoundingClientRect(), hr = q(".lv-have").getBoundingClientRect();
      kryb((tr.left - hr.left) / hr.width, () => {
        Spil.burstAt(larve, "✨🌟✨🌟✨");
        Spil.tone([523, 659, 784, 1047, 1319], .14);
        larve.remove(); larve = null;
        tilstand.fase = "puppe"; gem();
        visPuppe();
        later(() => sig(["larve-puppe"]), 600);
      });
    }, 4200);
  }

  function visPuppe() {
    q(".lv-bar").innerHTML = "";
    const p = document.createElement("div");
    p.className = "lv-puppe"; p.setAttribute("aria-label", "Puppe"); p.setAttribute("role", "button");
    // Bred foroven, spids forneden, med ringe og et bånd af små guldprikker
    p.innerHTML = `<svg viewBox="0 0 50 90">
      <defs><linearGradient id="lv-puppe-g" x1="0" x2="1"><stop offset="0" stop-color="#6fa63e"/><stop offset=".45" stop-color="#b6e07a"/><stop offset="1" stop-color="#6fa63e"/></linearGradient></defs>
      <path d="M25 2 C37 3 46 16 46 34 C46 54 36 74 25 88 C14 74 4 54 4 34 C4 16 13 3 25 2 Z" fill="url(#lv-puppe-g)" stroke="#55862f" stroke-width="2"/>
      <g fill="none" stroke="#55862f" stroke-width="1.8" stroke-linecap="round" opacity=".7">
        <path d="M8 48 Q25 56 42 48"/><path d="M11 60 Q25 67 39 60"/><path d="M16 72 Q25 77 34 72"/></g>
      <g fill="#ffd84d" stroke="#c9a227" stroke-width=".8"><circle cx="11" cy="36" r="1.9"/><circle cx="18" cy="37.5" r="1.9"/><circle cx="25" cy="38" r="1.9"/><circle cx="32" cy="37.5" r="1.9"/><circle cx="39" cy="36" r="1.9"/></g>
      <ellipse cx="17" cy="20" rx="4" ry="9" fill="#fff" opacity=".35"/>
    </svg>`;
    q(".lv-gren").appendChild(p);
    let tryk = 0;
    p.onclick = e => {
      e.stopPropagation();
      if (q(".lv-have").classList.contains("nat")) return;
      tryk++;
      p.classList.remove("vrik"); void p.offsetWidth; p.classList.add("vrik");
      Spil.tone([300 + tryk * 120, 200 + tryk * 120], .08, "triangle");
      if (tryk >= 4) {
        p.onclick = null;
        Spil.burstAt(p, "✨🦋✨🌟✨🦋");
        Spil.sfx.fanfare();
        later(() => { p.remove(); mal(); }, 500);
      }
    };
  }

  function mal() {
    tilstand.fase = "mal"; gem();
    const farver = { op: "#ffffff", ned: "#ffffff", prik: "#ffffff" };
    let valgt = null, malet = 0;
    const m = document.createElement("div");
    m.className = "lv-mal";
    m.innerHTML = sommerfuglSVG(farver, "stor") + `<div class="lv-potter"></div><button class="lv-faerdig" aria-label="Flyv">🦋</button>`;
    root.querySelector(".lv").appendChild(m);
    const potter = m.querySelector(".lv-potter");
    MALING.forEach(f => {
      const b = document.createElement("button");
      b.className = "lv-potte"; b.style.setProperty("--c", f.hex); b.setAttribute("aria-label", f.key);
      b.onclick = () => {
        valgt = f;
        potter.querySelectorAll(".lv-potte").forEach(x => x.classList.toggle("valgt", x === b));
        Spil.sfx.click();
        sig(["farve-" + f.key]);
      };
      potter.appendChild(b);
    });
    // Tryk på en del af vingen: den farves på begge sider
    m.querySelectorAll(".lv-op,.lv-ned,.lv-prik").forEach(el => {
      el.addEventListener("click", () => {
        if (!valgt) { valgt = pick(MALING); potter.children[MALING.indexOf(valgt)].classList.add("valgt"); }
        const del = el.classList.contains("lv-op") ? "op" : el.classList.contains("lv-ned") ? "ned" : "prik";
        farver[del] = valgt.hex;
        m.querySelectorAll(".lv-" + del).forEach(x => x.setAttribute("fill", valgt.hex));
        Spil.sfx.pop();
        const r = el.getBoundingClientRect();
        Spil.burst(r.left + r.width / 2, r.top + r.height / 2, "✨⭐✨");
        malet++;
        if (malet === 1) { m.querySelector(".lv-faerdig").classList.add("klar"); later(() => sig(["larve-flyv"]), 1600); }
      });
    });
    m.querySelector(".lv-faerdig").onclick = () => {
      if (!malet) { sig(["larve-mal"]); return; }
      m.querySelector(".lv-faerdig").onclick = null;
      m.classList.add("flyv");
      Spil.tone([659, 784, 988, 1175, 1319, 1568], .1);
      tilstand.fugle.push(Object.assign({}, farver));
      tilstand.fugle = tilstand.fugle.slice(-12);
      later(() => {
        m.remove();
        tegnFlok();
        nytAeg(true);
      }, 1700);
    };
    later(() => sig(["larve-sommerfugl", "larve-mal"]), 400);
  }

  /* ---------- Æg ---------- */
  function nytAeg(farvel) {
    tilstand.fase = "aeg"; tilstand.dag = 1;
    tilstand.farve = farvel ? pick(LARVEFARVER.filter(c => c !== tilstand.farve)) : tilstand.farve;
    gem();
    larve?.remove(); larve = null;
    tegnBar();
    const seng = q(".lv-seng");
    seng.querySelector(".lv-aeg")?.remove();
    const a = document.createElement("div");
    a.className = "lv-aeg"; a.setAttribute("aria-label", "Æg"); a.setAttribute("role", "button");
    seng.appendChild(a);
    let tryk = 0;
    a.onclick = e => {
      e.stopPropagation();
      tryk++;
      a.classList.remove("vrik"); void a.offsetWidth; a.classList.add("vrik");
      Spil.tone([500 + tryk * 100], .08, "triangle");
      if (tryk >= 3) {
        a.onclick = null;
        Spil.burstAt(a, "✨⭐✨⭐✨");
        Spil.sfx.right();
        later(() => {
          a.remove();
          tilstand.fase = "larve"; gem();
          nyLarve();
          tegnBar("aeble");
          Spil.burstAt(larve, "✨💚✨");
          sig(["larve-klaek", "larve-sulten"]);
          nyDag();
        }, 300);
      }
    };
    sig([farvel ? "larve-farvel" : "larve-aeg"]);
  }

  Spil.register({
    id: "larven", navn: "Larven", ikon: "🐛", farve: "#d6f2b8",
    start(r) {
      Spil.preload(Object.keys(T));
      root = r; alive = true; timers = []; koe = []; travl = false; larve = null; spist = 0; leget = 0; natTok = 0;
      const dyb = dybTilstand(Spil.dyb || "");
      dybTest = !!dyb;
      tilstand = dyb || hent();
      bygHave();
      if (tilstand.fase === "mal") tilstand.fase = "puppe";
      if (tilstand.fase === "aeg") nytAeg(false);
      else if (tilstand.fase === "puppe") { visPuppe(); later(() => sig(["larve-puppe"]), 300); }
      else {
        nyLarve();
        sig(["larve-hej-igen", "larve-sulten"]);
        nyDag();
      }
      if (dyb) dybEfterStart(Spil.dyb);
      // Sommerfuglene flytter sig rundt i haven
      flokTimer = setInterval(() => {
        if (!alive) return;
        const f = root.querySelectorAll(".lv-flok .lv-fugl");
        if (f.length) flyt(pick([...f]));
        const mh = root.querySelector(".lv-mh");
        if (mh && Math.random() < .3 && !koe.some(k => k.type === "mh")) mh.style.left = (.18 + Math.random() * .6) * 100 + "%";
        // Keder larven sig, kravler den lidt rundt af sig selv
        if (larve && !travl && tilstand.fase === "larve" && !q(".lv-have").classList.contains("nat") && Math.random() < .12) {
          travl = true; boble(null);
          kryb(.2 + Math.random() * .55, () => { travl = false; opdaterBehov(); naeste(); });
        }
      }, 1600);
      kropTimer = () => { maalGynge(); placerStjerner(); };
      window.addEventListener("resize", kropTimer);
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); clearTimeout(idleTimer); clearInterval(flokTimer);
      window.removeEventListener("resize", kropTimer);
    }
  });
})();
