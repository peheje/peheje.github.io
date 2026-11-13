// Spil: Vendespillet — klassisk vendespil med temaer. Find to ens!
// Først vælger man tema (dyr, køretøjer, frugt og grønt, former og farver),
// så hvor mange kort der skal være. Tema-fliserne er store billeder uden tekst,
// så barnet ikke behøver kunne læse. Sidste tema huskes og fremhæves let.
// Når alle par er fundet, er der fest, og næste runde bliver lidt sværere af sig selv.
// På de lette trin vises kortene kort med billedsiden op, før de vendes ("Kig godt!").
// Ingen tabe-tilstand: to forskellige kort vender bare om igen.
(function () {
  // Samme dyr som i Find dyret, så ja-<dyr> ("Ja! Koen siger muh!") kan genbruges
  const DYR = [
    { emoji: "🐄", key: "ko" }, { emoji: "🐈", key: "kat" }, { emoji: "🐕", key: "hund" },
    { emoji: "🐖", key: "gris" }, { emoji: "🦆", key: "and" }, { emoji: "🐑", key: "faar" },
    { emoji: "🐎", key: "hest" }, { emoji: "🦁", key: "loeve" }, { emoji: "🐸", key: "froe" },
    { emoji: "🦉", key: "ugle" }, { emoji: "🐔", key: "hoene" }, { emoji: "🐭", key: "mus" },
    { emoji: "🐘", key: "elefant" }, { emoji: "🐒", key: "abe" }, { emoji: "🐟", key: "fisk" },
    { emoji: "🐝", key: "bi" }, { emoji: "🐻", key: "bjoern" }, { emoji: "🐍", key: "slange" },
  ];

  // Køretøjer og frugt/grønt: emoji der ligner det, de forestiller.
  // noegle er navnet på lydfilen i lyd/, tekst bruges indtil filen findes.
  const KOERETOEJER = [
    { emoji: "🚗", noegle: "vend-bil", tekst: "Ja! Det er en bil!" },
    { emoji: "🚒", noegle: "vend-brandbil", tekst: "Ja! Det er en brandbil!" },
    { emoji: "🚜", noegle: "vend-traktor", tekst: "Ja! Det er en traktor!" },
    { emoji: "✈️", noegle: "vend-fly", tekst: "Ja! Det er et fly!" },
    { emoji: "🚂", noegle: "vend-tog", tekst: "Ja! Det er et tog!" },
    { emoji: "🚲", noegle: "vend-cykel", tekst: "Ja! Det er en cykel!" },
    { emoji: "🚁", noegle: "vend-helikopter", tekst: "Ja! Det er en helikopter!" },
    { emoji: "⛵", noegle: "vend-baad", tekst: "Ja! Det er en båd!" },
    { emoji: "🚌", noegle: "vend-bus", tekst: "Ja! Det er en bus!" },
    { emoji: "🚑", noegle: "vend-ambulance", tekst: "Ja! Det er en ambulance!" },
    { emoji: "🏍️", noegle: "vend-motorcykel", tekst: "Ja! Det er en motorcykel!" },
    { emoji: "🛵", noegle: "vend-scooter", tekst: "Ja! Det er en scooter!" },
  ];
  const FRUGT = [
    { emoji: "🍎", noegle: "vend-aeble", tekst: "Ja! Det er et æble!" },
    { emoji: "🍌", noegle: "vend-banan", tekst: "Ja! Det er en banan!" },
    { emoji: "🍓", noegle: "vend-jordbaer", tekst: "Ja! Det er et jordbær!" },
    { emoji: "🍇", noegle: "vend-vindruer", tekst: "Ja! Det er vindruer!" },
    { emoji: "🍊", noegle: "vend-appelsin", tekst: "Ja! Det er en appelsin!" },
    { emoji: "🍉", noegle: "vend-vandmelon", tekst: "Ja! Det er en vandmelon!" },
    { emoji: "🥕", noegle: "vend-gulerod", tekst: "Ja! Det er en gulerod!" },
    { emoji: "🍒", noegle: "vend-kirsebaer", tekst: "Ja! Det er et kirsebær!" },
    { emoji: "🍍", noegle: "vend-ananas", tekst: "Ja! Det er en ananas!" },
    { emoji: "🥦", noegle: "vend-broccoli", tekst: "Ja! Det er broccoli!" },
    { emoji: "🍋", noegle: "vend-citron", tekst: "Ja! Det er en citron!" },
    { emoji: "🍐", noegle: "vend-paere", tekst: "Ja! Det er en pære!" },
  ];

  // Former og farver tegnes som SVG, så de ser ens ud på alle skærme.
  // Hvert kort er unikt: en form i en farve.
  const FARVE_KODE = { roed: "#e5484d", blaa: "#3d7be0", gul: "#f5c518", groen: "#37a852", lilla: "#9b5de5", orange: "#f7861f" };
  const FARVE_NAVN = { roed: "rød", blaa: "blå", gul: "gul", groen: "grøn", lilla: "lilla", orange: "orange" };
  const FORM_STI = {
    cirkel: '<circle cx="50" cy="50" r="45"/>',
    firkant: '<rect x="7" y="7" width="86" height="86" rx="12"/>',
    trekant: '<polygon points="50,5 96,92 4,92"/>',
    stjerne: '<polygon points="50,3 61,36 96,36 68,57 79,92 50,71 21,92 32,57 4,36 39,36"/>',
    hjerte: '<path d="M50 90 C22 70 4 52 4 31 C4 16 15 7 28 7 C38 7 46 13 50 23 C54 13 62 7 72 7 C85 7 96 16 96 31 C96 52 78 70 50 90 Z"/>',
    maane: '<path d="M75 8 A44 44 0 1 0 75 92 A52 52 0 0 1 75 8 Z"/>',
  };
  const FORM_NAVN = { cirkel: "cirkel!", firkant: "firkant!", trekant: "trekant!", stjerne: "stjerne!", hjerte: "hjerte!", maane: "måne!" };
  const FORM_ARTIKEL = { hjerte: "et" }; // alle andre er fælleskøn: en cirkel, en måne ...
  const formSvg = (farve, form) =>
    `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${FARVE_KODE[farve]}">${FORM_STI[form]}</g></svg>`;

  // Ikon til tema-fliserne: fire former i hver sin farve, så det fylder lige så meget som de andre ikoner
  const FORMER_IKON = `<svg viewBox="0 0 100 100" aria-hidden="true">${
    [["roed", "cirkel", 0, 0], ["blaa", "firkant", 52, 0], ["gul", "trekant", 0, 52], ["groen", "stjerne", 52, 52]]
      .map(([f, form, x, y]) => `<g fill="${FARVE_KODE[f]}" transform="translate(${x} ${y}) scale(.48)">${FORM_STI[form]}</g>`).join("")
  }</svg>`;

  // Hjerte og måne får lilla/orange: de farveord bøjes ikke ("et lilla hjerte", "en orange måne").
  const FORMER = [
    ["roed", "cirkel"], ["blaa", "firkant"], ["gul", "trekant"], ["groen", "stjerne"],
    ["lilla", "hjerte"], ["orange", "maane"], ["blaa", "cirkel"], ["roed", "firkant"],
    ["groen", "trekant"], ["gul", "stjerne"], ["orange", "hjerte"], ["lilla", "maane"],
  ].map(([farve, form]) => ({
    form, farve, svg: formSvg(farve, form),
    // Hele sætninger, én lydfil pr. kort: "Ja! En rød cirkel!"
    noegler: ["vend-former-" + farve + "-" + form],
    tekst: "Ja! " + (FORM_ARTIKEL[form] ? "Et" : "En") + " " + FARVE_NAVN[farve] + " " + FORM_NAVN[form],
  }));

  // Temaerne. noegler(ting) giver lydfilerne, der siges, når et par findes.
  const TEMAER = [
    { id: "dyr", navn: "Dyr", ikon: "🐄", bagtegn: "🐾", farve: "#d6f0c9", stemme: "vend-tema-dyr", kig: "vend-kig",
      ting: DYR, noegler: t => Spil.jaDyr(t.key) },
    { id: "koeretoejer", navn: "Køretøjer", ikon: "🚗", bagtegn: "🏁", farve: "#cfe8ff", stemme: "vend-tema-koeretoejer",
      kig: "vend-kig-koeretoejer", ting: KOERETOEJER, noegler: t => [t.noegle] },
    { id: "frugt", navn: "Frugt og grønt", ikon: "🍎", bagtegn: "🍃", farve: "#ffd9d4", stemme: "vend-tema-frugt",
      kig: "vend-kig-frugt", ting: FRUGT, noegler: t => [t.noegle] },
    { id: "former", navn: "Former og farver", ikon: "🔺", bagtegn: "✨", svgIkon: FORMER_IKON, farve: "#e8dcff", stemme: "vend-tema-former",
      kig: "vend-kig-former", ting: FORMER, noegler: t => t.noegler },
  ];

  // Trin: antal par, og hvor længe kortene vises først (0 = ingen kig)
  const TRIN = [
    { par: 2, kig: 2200 }, { par: 3, kig: 2600 }, { par: 4, kig: 3000 },
    { par: 6, kig: 3200 }, { par: 8, kig: 0 }, { par: 10, kig: 0 },
  ];
  const BAGSIDER = ["#ff8fab", "#7cc6f2", "#ffc93c", "#9ad987", "#b48cf0", "#ffa04a"];

  const T = {
    "vend-hej": "Hej! Lad os spille vendespil.",
    "vend-tema": "Hvad vil du spille med?",
    "vend-tema-dyr": "Dyr!",
    "vend-tema-koeretoejer": "Køretøjer!",
    "vend-tema-frugt": "Frugt og grønt!",
    "vend-tema-former": "Former og farver!",
    "vend-vaelg": "Hvor mange kort vil du spille med?",
    "vend-kig": "Kig godt på dyrene!",
    "vend-kig-koeretoejer": "Kig godt på køretøjerne!",
    "vend-kig-frugt": "Kig godt på frugterne!",
    "vend-kig-former": "Kig godt på formerne og farverne!",
    "vend-find": "Find to ens!",
    "vend-ikke": "De er ikke ens. Prøv igen!",
    "vend-alle": "Du fandt dem alle sammen!",
    "vend-svaerere": "Nu bliver det lidt sværere!",
    "vend-mester": "Det sværeste spil! Du er en mester!",
    "ros-0": "Super!", "ros-1": "Flot klaret!", "ros-2": "Sejt!", "ros-4": "Wow!",
  };
  DYR.forEach(d => { T["ja-" + d.key] = "Ja!"; });
  KOERETOEJER.forEach(t => { T[t.noegle] = t.tekst; });
  FRUGT.forEach(t => { T[t.noegle] = t.tekst; });
  FORMER.forEach(f => { T[f.noegler[0]] = f.tekst; });

  Spil.css("css-vendespil", `
    .vs{position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;
      background:radial-gradient(120% 70% at 50% 0%,#eaf6ff 0 40%,transparent 41%),
        radial-gradient(circle at 12% 88%,#ffe4ec 0 14%,transparent 15%),radial-gradient(circle at 92% 70%,#fff3c4 0 10%,transparent 11%),
        #dff0fb}
    .vs-top{flex:none;position:relative;z-index:3;display:flex;align-items:center;justify-content:center;
      height:calc(2vh + clamp(52px,8.5vh,78px));padding-top:calc(1.5vh + env(safe-area-inset-top,0px));box-sizing:border-box;
      padding-inline:calc(3 * clamp(52px,8.5vh,78px) + 60px)}
    @media (max-aspect-ratio:1/1){
      .vs-top{height:auto;padding:calc(2vh + clamp(52px,8.5vh,78px) + 1.4vh + env(safe-area-inset-top,0px)) 16px 0}
    }
    .vs-fundet{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(2px,.6vw,8px);background:#ffffffc9;border-radius:999px;
      padding:4px clamp(8px,1.6vw,14px);box-shadow:0 4px 0 rgba(31,58,95,.1);max-width:100%}
    .vs-fundet:empty{display:none}
    .vs-fundet span{display:inline-flex;align-items:center;justify-content:center;
      font-size:clamp(20px,min(3.8vh,6vw),34px);line-height:1;opacity:.3;filter:grayscale(1)}
    .vs-fundet span.on{opacity:1;filter:none;animation:vs-plop .4s}
    /* Tom plads: et lille stiplet kort, der venter på sit par */
    .vs-fundet span:not(.on){opacity:1;filter:none;width:.8em;height:1.05em;margin:.04em .12em;box-sizing:border-box;
      border:max(2px,.09em) dashed #a9c3da;border-radius:.2em;background:#eef5fb}
    .vs-fundet .vs-form{width:1em;height:1em}
    .vs-rund{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));width:clamp(52px,8.5vh,78px);aspect-ratio:1;border-radius:50%;
      font-size:clamp(24px,4vh,38px);z-index:5;display:grid;place-items:center;padding:0}
    .vs-sig{right:max(16px,env(safe-area-inset-right,0px));background:var(--sun);box-shadow:0 6px 0 #d9a21a}
    .vs-sig:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}
    .vs-menu-knap{right:calc(max(16px,env(safe-area-inset-right,0px)) + clamp(52px,8.5vh,78px) + 14px);background:var(--card);box-shadow:0 6px 0 rgba(31,58,95,.25)}
    .vs-menu-knap:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    .vs-tema-knap{right:calc(max(16px,env(safe-area-inset-right,0px)) + 2 * (clamp(52px,8.5vh,78px) + 14px));
      background:var(--card);box-shadow:0 6px 0 rgba(31,58,95,.25)}
    .vs-tema-knap:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    /* Når kort-knappen er skjult (vælg antal kort), rykker tema-knappen ind ved siden af 🔊, så der ikke er et hul */
    .vs:has(.vs-menu-knap[hidden]) .vs-tema-knap{right:calc(max(16px,env(safe-area-inset-right,0px)) + clamp(52px,8.5vh,78px) + 14px)}
    /* Lille ikon af en kortbunke (2×2 kort) */
    .vs-ikon{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;width:52%}
    .vs-ikon i{aspect-ratio:3/4;border-radius:3px;background:#7cc6f2}
    .vs-ikon i:nth-child(2),.vs-ikon i:nth-child(3){background:#ff8fab}

    /* Brættet: kortstørrelsen (--w) og antal kolonner sættes fra JS, så alt passer på skærmen */
    /* flex-wrap i stedet for grid, så en halv sidste række står i midten */
    .vs-braet{flex:1;min-height:0;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:var(--g,12px);
      margin-inline:auto;width:calc(var(--kol,4) * var(--w,100px) + (var(--kol,4) - 1) * var(--g,12px));box-sizing:content-box;
      padding:1vh max(16px,env(safe-area-inset-right,0px)) calc(2.5vh + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
    .vs-kort{width:var(--w);aspect-ratio:3/4;padding:0;background:none;perspective:900px;animation:vs-ind .4s backwards}
    @keyframes vs-ind{from{transform:scale(.3) rotate(-10deg);opacity:0}}
    .vs-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,1.3,.6,1)}
    .vs-kort.aaben .vs-inner,.vs-kort.fundet .vs-inner{transform:rotateY(180deg)}
    .vs-side{position:absolute;inset:0;border-radius:calc(var(--w)*.14);-webkit-backface-visibility:hidden;backface-visibility:hidden;
      display:grid;place-items:center;box-shadow:0 calc(var(--w)*.05) 0 rgba(31,58,95,.22)}
    .vs-bag{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.35) 0 22%,transparent 23%),
        repeating-linear-gradient(45deg,rgba(255,255,255,.18) 0 8px,transparent 8px 16px),var(--bag);
      border:calc(var(--w)*.05) solid #fff;box-sizing:border-box}
    .vs-bag::after{content:var(--bt,"🐾");font-size:calc(var(--w)*.3);opacity:.85}
    .vs-for{background:var(--card);transform:rotateY(180deg);font-size:calc(var(--w)*.62);line-height:1;border:calc(var(--w)*.04) solid #fff;box-sizing:border-box}
    .vs-for .vs-form{width:68%;height:68%;display:block}
    .vs-form svg{width:100%;height:100%;display:block;filter:drop-shadow(0 2px 1px rgba(31,58,95,.16))}
    .vs-kort.fundet .vs-for{background:#fff3c4;border-color:#ffd84d;animation:vs-hop .6s .15s}
    .vs-kort.fundet{cursor:default}
    .vs-kort.rystet .vs-inner{animation:vs-ryst .4s}
    @keyframes vs-ryst{25%{transform:rotateY(180deg) rotate(-5deg)}75%{transform:rotateY(180deg) rotate(5deg)}}
    @keyframes vs-hop{40%{transform:rotateY(180deg) translateY(-12%) scale(1.08)}}
    @keyframes vs-plop{50%{transform:scale(1.4)}}

    /* Vælg tema: fire store billedfliser uden tekst */
    .vs-temaer{flex:1;min-height:0;display:grid;place-content:center;gap:clamp(12px,3vmin,30px);
      grid-template-columns:repeat(4,var(--tk));padding:2vh 16px calc(4vh + env(safe-area-inset-bottom,0px));
      --tk:min(19vw,30vh,230px)}
    @media (max-aspect-ratio:1/1){.vs-temaer{grid-template-columns:repeat(2,var(--tk));--tk:min(40vw,23vh,230px)}}
    .vs-tema{position:relative;width:var(--tk);aspect-ratio:1;border-radius:clamp(20px,3.4vh,34px);background:var(--tf,var(--card));
      box-shadow:0 9px 0 rgba(31,58,95,.2);display:grid;place-items:center;font-size:calc(var(--tk)*.48);line-height:1;
      animation:vs-ind .4s backwards}
    .vs-tema .vs-tema-svg{width:64%;height:64%;display:block}
    .vs-tema-knap .vs-tema-svg{width:62%;height:62%;display:block}
    .vs-tema:active{transform:translateY(5px);box-shadow:0 4px 0 rgba(31,58,95,.2)}
    .vs-tema.sidst{box-shadow:0 9px 0 #e3b630,0 0 0 6px #ffd84d}
    .vs-tema.sidst::after{content:"⭐";position:absolute;top:-9px;right:-9px;font-size:clamp(22px,3.4vh,34px);line-height:1;
      filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}

    /* Vælg sværhed: seks store knapper med små kortbunker */
    .vs-vaelg{flex:1;min-height:0;display:grid;place-content:center;gap:clamp(12px,3vmin,30px);
      grid-template-columns:repeat(3,var(--vk));padding:2vh 16px calc(4vh + env(safe-area-inset-bottom,0px));
      --vk:min(26vw,30vh,230px)}
    @media (max-aspect-ratio:1/1){.vs-vaelg{grid-template-columns:repeat(2,var(--vk));--vk:min(40vw,23vh,230px)}}
    .vs-trin{position:relative;width:var(--vk);aspect-ratio:1;border-radius:clamp(20px,3.4vh,34px);background:var(--card);
      box-shadow:0 9px 0 rgba(31,58,95,.2);display:grid;place-items:center;padding:12%;box-sizing:border-box;animation:vs-ind .4s backwards}
    .vs-trin:active{transform:translateY(5px);box-shadow:0 4px 0 rgba(31,58,95,.2)}
    .vs-trin .vs-mini{display:grid;gap:5%;justify-items:center;align-content:center}
    .vs-trin .vs-mini i{width:100%;aspect-ratio:3/4;border-radius:18%;background:var(--bag);box-shadow:0 2px 0 rgba(31,58,95,.2)}
    .vs-trin b{position:absolute;top:-10px;right:-10px;font-size:clamp(26px,4.4vh,40px);line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
    .vs-trin.naeste{animation:vs-puls 1.2s ease-in-out infinite;box-shadow:0 9px 0 #e3b630,0 0 0 6px #ffd84d}
    @keyframes vs-puls{50%{transform:scale(1.06)}}

    /* Fest */
    .vs-fest{position:absolute;inset:0;z-index:10;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;
      gap:clamp(14px,3vmin,30px);padding:16px;background:radial-gradient(90% 70% at 50% 40%,#fdfbff,#bfe4fb)}
    /* Hvert fundet par danser på sit eget lille kort med billedsiden op, ligesom på brættet */
    .vs-fest b{display:inline-flex;align-items:center;justify-content:center;font-size:var(--fs,70px);line-height:1;
      width:1.3em;aspect-ratio:3/4;box-sizing:border-box;border-radius:.2em;background:#fff3c4;border:.06em solid #ffd84d;
      box-shadow:0 .07em 0 rgba(31,58,95,.2);animation:vs-dans-kort 1s ease-in-out infinite}
    @keyframes vs-dans-kort{50%{transform:translateY(-10%) rotate(6deg) scale(1.04)}}
    .vs-fest b .vs-form{width:.9em;height:.9em;display:block}
    @keyframes vs-dans{50%{transform:translateY(-22%) rotate(8deg) scale(1.08)}}

    @media (prefers-reduced-motion:reduce){
      .vs-inner{transition:none}
      .vs-kort,.vs-trin,.vs-trin.naeste,.vs-tema,.vs-kort.fundet .vs-for,.vs-kort.rystet .vs-inner,.vs-fest b,.vs-fundet span.on{animation:none}
    }
  `);

  let root, alive, timers, trin, bedst, kort, aabne, laas, fundet, forkerte, sidstValg, onResize, temaId, skaerm;
  const later = (fn, ms) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const q = sel => root.querySelector(sel);
  const sig = (keys, done) => Spil.say(keys.map(k => T[k] || "").join(" "), done, keys);
  const gem = () => { try { localStorage.setItem("lk-vendespil", String(bedst)); } catch (e) {} };
  const gemTema = () => { try { localStorage.setItem("lk-vendespil-tema", temaId); } catch (e) {} };
  const temaObj = () => TEMAER.find(t => t.id === temaId) || TEMAER[0];
  // Et kort vises med emoji eller med en tegnet form (SVG)
  // Temaets ikon: tegnet SVG (hvis det har et) ellers emoji
  const temaIkon = t => t.svgIkon ? `<i class="vs-form vs-tema-svg">${t.svgIkon}</i>` : t.ikon;
  const ikon = t => t.svg ? `<i class="vs-form">${t.svg}</i>` : t.emoji;

  // Mini-kortbunke på vælg-knapperne: så mange små kort som i spillet
  const miniKol = n => n <= 4 ? 2 : n <= 6 ? 3 : n <= 16 ? 4 : 5;
  // Hvor bred bunken må være (i %), så den også passer i højden (kortene er 3:4, mellemrum 5%)
  const miniBredde = n => {
    const k = miniKol(n), r = Math.ceil(n / k), w = (1 - (k - 1) * .05) / k;
    return Math.min(100, 100 / (r * w * 4 / 3 + (r - 1) * .05)).toFixed(1);
  };

  /* ---------- Vælg tema ---------- */
  function visTema(snak = true) {
    laas = true; kort = []; skaerm = "tema";
    q(".vs-fundet").innerHTML = "";
    q(".vs-menu-knap").hidden = true;
    q(".vs-tema-knap").hidden = true;
    const omr = q(".vs-omraade");
    omr.className = "vs-omraade vs-temaer";
    omr.innerHTML = "";
    TEMAER.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "vs-tema" + (t.id === temaId ? " sidst" : "");
      b.style.setProperty("--tf", t.farve);
      b.style.animationDelay = (i * .05) + "s";
      b.setAttribute("aria-label", t.navn);
      b.innerHTML = temaIkon(t);
      b.onclick = () => vaelgTema(t);
      omr.appendChild(b);
    });
    if (snak) sig(["vend-tema"]);
  }

  function vaelgTema(t) {
    if (!alive) return;
    if (t.id !== temaId) sidstValg = [];
    temaId = t.id; gemTema();
    Spil.sfx.click();
    visVaelg(false);
    sig([t.stemme, "vend-vaelg"]);
  }

  /* ---------- Vælg sværhed ---------- */
  function visVaelg(snak = true) {
    laas = true; kort = []; skaerm = "vaelg";
    q(".vs-fundet").innerHTML = "";
    q(".vs-menu-knap").hidden = true;
    const temaKnap = q(".vs-tema-knap");
    temaKnap.hidden = false;
    temaKnap.innerHTML = temaIkon(temaObj());
    temaKnap.style.background = temaObj().farve;
    const naeste = Math.min(bedst + 1, TRIN.length - 1);
    const omr = q(".vs-omraade");
    omr.className = "vs-omraade vs-vaelg";
    omr.innerHTML = "";
    TRIN.forEach((t, i) => {
      const b = document.createElement("button");
      const n = t.par * 2, farve = BAGSIDER[i % BAGSIDER.length];
      b.className = "vs-trin" + (i === naeste ? " naeste" : "");
      b.style.animationDelay = (i * .05) + "s";
      b.setAttribute("aria-label", n + " kort");
      b.innerHTML = `<div class="vs-mini" style="grid-template-columns:repeat(${miniKol(n)},1fr);width:${miniBredde(n)}%;--bag:${farve}">${"<i></i>".repeat(n)}</div>`
        + (i <= bedst ? "<b>⭐</b>" : "");
      b.onclick = () => { Spil.sfx.click(); startSpil(i); };
      omr.appendChild(b);
    });
    if (snak) sig(["vend-vaelg"]);
  }

  /* ---------- Spillet ---------- */
  function startSpil(i, foer = []) {
    if (!alive) return;
    trin = i; aabne = []; fundet = 0; forkerte = 0; laas = true; skaerm = "spil";
    const t = TRIN[i];
    const tema = temaObj();
    q(".vs-menu-knap").hidden = false;
    q(".vs-tema-knap").hidden = false;
    // Vælg ting fra temaet, men helst ikke de samme som sidst
    const friske = Spil.shuffle(tema.ting.filter(x => !sidstValg.includes(x)));
    const valgt = friske.concat(Spil.shuffle(tema.ting.filter(x => sidstValg.includes(x)))).slice(0, t.par);
    sidstValg = valgt;
    const bag = BAGSIDER[Math.random() * BAGSIDER.length | 0];
    q(".vs-fundet").innerHTML = valgt.map(() => "<span></span>").join("");

    const omr = q(".vs-omraade");
    omr.className = "vs-omraade vs-braet";
    omr.innerHTML = "";
    kort = Spil.shuffle(valgt.concat(valgt).map(ting => ({ ting })));
    kort.forEach((k, n) => {
      const b = document.createElement("button");
      b.className = "vs-kort"; b.style.setProperty("--bag", bag); b.style.setProperty("--bt", `"${tema.bagtegn}"`);
      b.style.animationDelay = (n * .03) + "s";
      b.setAttribute("aria-label", "Kort");
      b.innerHTML = `<div class="vs-inner"><div class="vs-side vs-bag"></div><div class="vs-side vs-for">${ikon(k.ting)}</div></div>`;
      b.onclick = () => vend(k);
      k.el = b;
      omr.appendChild(b);
    });
    tilpas();

    if (t.kig) {
      // Kig: alle kort vises først, og vendes så om
      // Kortene vendes først, når kigge-tiden er gået OG stemmen er stille ("Nu bliver det lidt sværere! Kig godt ..."),
      // så "Find to ens!" ikke afbryder den. Højst 2,5 s ekstra, så det ikke kan trække ud.
      later(() => kort.forEach(k => k.el.classList.add("aaben")), 500);
      const senest = Date.now() + 500 + t.kig + 2500;
      const skjul = () => {
        if (Spil.isTalking() && Date.now() < senest) { later(skjul, 200); return; }
        kort.forEach(k => k.el.classList.remove("aaben"));
        Spil.tone([660, 520], .08);
        later(() => { laas = false; sig(["vend-find"]); }, 500);
      };
      sig([...foer, tema.kig]);
      later(skjul, 500 + t.kig);
    } else {
      sig([...foer, "vend-find"]);
      later(() => { laas = false; }, 400);
    }
  }

  // Find den kolonne-opdeling, der giver de største kort på skærmen
  function tilpas() {
    const omr = q(".vs-braet");
    if (!omr || !kort.length) return;
    const cs = getComputedStyle(omr);
    const W = q(".vs").clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = omr.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const n = kort.length, g = Math.max(8, Math.min(18, Math.min(W, H) * .022));
    let bedstW = 0, bedstK = 1;
    for (let k = 1; k <= n; k++) {
      const r = Math.ceil(n / k);
      if (k * r - n >= Math.min(k, r)) continue; // undgå en hel tom række/kolonne
      const w = Math.min((W - (k - 1) * g) / k, ((H - (r - 1) * g) / r) * .75);
      // Foretræk opdelinger uden et halvt tomt sidste række
      const straf = n % k ? .92 : 1;
      if (w * straf > bedstW) { bedstW = w * straf; bedstK = k; }
    }
    const r = Math.ceil(n / bedstK);
    const w = Math.floor(Math.min((W - (bedstK - 1) * g) / bedstK, ((H - (r - 1) * g) / r) * .75, 220));
    omr.style.setProperty("--kol", bedstK);
    omr.style.setProperty("--w", w + "px");
    omr.style.setProperty("--g", g + "px");
  }

  function vend(k) {
    if (!alive || laas || k.fundet || aabne.includes(k)) return;
    k.el.classList.add("aaben");
    Spil.tone([520 + aabne.length * 140], .06, "triangle");
    aabne.push(k);
    if (aabne.length < 2) return;

    laas = true;
    const [a, b] = aabne;
    if (a.ting === b.ting) {
      later(() => {
        a.fundet = b.fundet = true;
        a.el.classList.add("fundet"); b.el.classList.add("fundet");
        Spil.sfx.right();
        Spil.burstAt(a.el, "✨⭐✨"); Spil.burstAt(b.el, "✨⭐✨");
        const slot = q(`.vs-fundet span:nth-child(${fundet + 1})`);
        if (slot) { slot.innerHTML = ikon(a.ting); slot.classList.add("on"); }
        fundet++;
        aabne = []; laas = false;
        const noegler = temaObj().noegler(a.ting);
        if (fundet === TRIN[trin].par) {
          // Festen venter, til replikken (og dyrets lyd) er helt færdig; sikkerhedstimer hvis den bliver afbrudt
          laas = true;
          let videre = false;
          const fest = () => { if (!videre) { videre = true; vundet(); } };
          sig(noegler, () => later(fest, 400));
          later(fest, 8000);
        }
        else sig(noegler);
      }, 380);
    } else {
      forkerte++;
      later(() => {
        a.el.classList.add("rystet"); b.el.classList.add("rystet");
        Spil.tone([330, 262], .12, "triangle");
        // Kun de første par gange, så stemmen ikke bliver træls
        if (forkerte <= 2) sig(["vend-ikke"]);
      }, 650);
      later(() => {
        [a, b].forEach(x => x.el.classList.remove("aaben", "rystet"));
        aabne = [];
        later(() => { laas = false; }, 250);
      }, 1500);
    }
  }

  function vundet() {
    if (trin > bedst) { bedst = trin; gem(); }
    const p = document.createElement("div");
    p.className = "vs-fest";
    p.innerHTML = sidstValg.map((d, i) => `<b style="animation-delay:${(i * .1).toFixed(2)}s">${ikon(d)}</b>`).join("");
    root.appendChild(p);
    // Find den kortstørrelse (i rækker), der fylder skærmen bedst: højst 60 % af højden, kort er 1,3em brede og 3:4
    const n = sidstValg.length, g = parseFloat(getComputedStyle(p).columnGap) || 12;
    const W = p.clientWidth - 32, H = p.clientHeight * .62;
    let bedstEm = 0, bedstK = n, bedstStraf = 1;
    for (let r = 1; r <= n; r++) {
      const k = Math.ceil(n / r);
      // Hver række får 15 % ekstra højde, så kortene kan danse uden at ramme hinanden
      const em = Math.min((W - (k - 1) * g) / k, ((H - (r - 1) * g) / r / 1.15) * .75) / 1.3;
      const straf = n % k && n % k < k / 2 ? .85 : 1; // helst ikke et enkelt kort alene i sidste række
      if (em * straf > bedstEm * (bedstStraf || 1)) { bedstEm = em; bedstK = k; bedstStraf = straf; }
    }
    const fs = Math.floor(Math.min(bedstEm, 130));
    p.style.setProperty("--fs", fs + "px");
    p.style.rowGap = Math.round(g + fs * 1.3 * 4 / 3 * .15) + "px";
    p.style.paddingInline = Math.max(16, (p.clientWidth - bedstK * fs * 1.3 - (bedstK - 1) * g) / 2 - 1) + "px";
    Spil.sfx.fanfare();
    sig(["vend-alle"]);
    const konfetti = () => Spil.burst(innerWidth * (.2 + Math.random() * .6), innerHeight * (.2 + Math.random() * .5), "🎉⭐🎈✨🎊🌟");
    konfetti(); later(konfetti, 500); later(konfetti, 1000); later(konfetti, 1500);
    p.onpointerdown = e => { Spil.sfx.pop(); Spil.burst(e.clientX, e.clientY, "🎉⭐🎈✨🎊🌟"); };
    later(() => {
      p.remove();
      // Næste runde bliver lidt sværere; på det sværeste trin spiller man det igen
      if (trin < TRIN.length - 1) startSpil(trin + 1, ["vend-svaerere"]);
      else startSpil(trin, ["vend-mester"]);
    }, 4200);
  }

  // Dybe links til test (Spil.dyb):
  //   "tema"                  vælg tema
  //   "dyr"                   vælg antal kort med temaet dyr (også koeretoejer, frugt, former)
  //   "dyr-3"                 spil trin 3 (1–6) med dyr, startet som normalt (med kig på trin 1–4)
  //   "dyr-3-aaben"           trin 3 med alle kort vendt op (til at se forsiderne)
  //   "dyr-3-naesten"         trin 3 med alle par fundet undtagen ét
  //   "fest-dyr"              festen efter en runde (trin 3)
  function dybtLink(d) {
    if (!d) return false;
    const m = /^(fest-)?([a-z]+)(?:-(\d))?(?:-(aaben|naesten))?$/.exec(d);
    if (!m) return false;
    if (m[2] === "tema") { visTema(); return true; }
    const tema = TEMAER.find(t => t.id === m[2]);
    if (!tema) return false;
    temaId = tema.id;
    const nr = Math.max(0, Math.min(TRIN.length - 1, (parseInt(m[3], 10) || 3) - 1));
    if (!m[1] && !m[3]) { visVaelg(); return true; }
    const temaKnap = q(".vs-tema-knap");
    temaKnap.innerHTML = temaIkon(tema); temaKnap.style.background = tema.farve;
    startSpil(nr);
    if (!m[1] && !m[4]) return true; // almindelig start på trinnet (med kig på de lette trin)
    timers.forEach(clearTimeout); timers = [];
    laas = false;
    if (m[1]) { kort.forEach(k => { k.fundet = true; k.el.classList.add("fundet"); }); fundet = TRIN[nr].par; vundet(); return true; }
    if (m[4] === "aaben") kort.forEach(k => k.el.classList.add("aaben"));
    if (m[4] === "naesten") {
      const sidste = kort[0].ting;
      kort.filter(k => k.ting !== sidste).forEach(k => { k.fundet = true; k.el.classList.add("fundet"); });
      q(".vs-fundet").querySelectorAll("span").forEach((s, i) => {
        const t = sidstValg.filter(x => x !== sidste)[i];
        if (t) { s.innerHTML = ikon(t); s.classList.add("on"); }
      });
      fundet = TRIN[nr].par - 1;
    }
    return true;
  }

  Spil.register({
    id: "vendespil", navn: "Vendespil", ikon: "🃏", farve: "#cfe8ff",
    start(r) {
      Spil.preload(Object.keys(T));
      root = r; alive = true; timers = []; kort = []; aabne = []; laas = true; sidstValg = [];
      bedst = -1;
      try { const v = parseInt(localStorage.getItem("lk-vendespil"), 10); if (!isNaN(v)) bedst = v; } catch (e) {}
      // Husk sidste tema (dyr, hvis der ikke er gemt noget brugbart)
      temaId = "dyr";
      try {
        const gemt = localStorage.getItem("lk-vendespil-tema");
        if (TEMAER.some(t => t.id === gemt)) temaId = gemt;
      } catch (e) {}
      root.innerHTML = `<div class="vs">
        <div class="vs-top"><div class="vs-fundet" aria-label="Fundne par"></div></div>
        <button class="vs-rund vs-tema-knap" aria-label="Vælg tema" hidden></button>
        <button class="vs-rund vs-menu-knap" aria-label="Vælg antal kort" hidden><span class="vs-ikon"><i></i><i></i><i></i><i></i></span></button>
        <button class="vs-rund vs-sig" aria-label="Sig det igen">🔊</button>
        <div class="vs-omraade"></div></div>`;
      // Mens alle kort vises (kig), gentager 🔊 "Kig godt på ..." i stedet for "Find to ens!"
      const kigger = () => skaerm === "spil" && kort.length && kort.every(k => !k.fundet && k.el.classList.contains("aaben"));
      q(".vs-sig").onclick = () => sig([skaerm === "tema" ? "vend-tema" : skaerm === "vaelg" ? "vend-vaelg" : kigger() ? temaObj().kig : "vend-find"]);
      q(".vs-menu-knap").onclick = () => { Spil.sfx.click(); timers.forEach(clearTimeout); timers = []; root.querySelector(".vs-fest")?.remove(); visVaelg(); };
      q(".vs-tema-knap").onclick = () => { Spil.sfx.click(); timers.forEach(clearTimeout); timers = []; root.querySelector(".vs-fest")?.remove(); visTema(); };
      onResize = () => tilpas();
      window.addEventListener("resize", onResize);
      if (dybtLink(Spil.dyb)) return;
      visTema(false);
      sig(["vend-hej", "vend-tema"]);
    },
    stop() {
      alive = false; timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
    }
  });
})();
