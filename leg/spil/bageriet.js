// Spil: Bageriet — dyr kommer ind i bageriet og bestiller en kage.
// Taleboblen viser kagen med billeder: form, farve på glasuren, hvilken pynt og hvor mange.
// Barnet bager kagen trin for trin: vælg form, hæld dej i, bag i ovnen, vælg glasur,
// vælg pynt, læg det rigtige antal på (stemmen tæller med) og giv kagen til kunden.
// Kunden betaler med en mønt; ved 5 mønter er der fest. Sværhedsgraden stiger langsomt.
// Ingen tabe-tilstand: forkerte valg giver blid hjælp, og lægger man én for meget på, tager en mus den.
(function () {
  // Formerne tegnes i en 100×100-boks (SVG). glans = et lysskær øverst til venstre på glasuren.
  const FORMER = [
    { key: "rund", svg: '<circle cx="50" cy="50" r="44"/>',
      glans: '<path d="M21 42A30 30 0 0 1 42 21"/><path d="M52 20.5h.1"/>' },
    { key: "firkant", svg: '<rect x="8" y="8" width="84" height="84" rx="10"/>',
      glans: '<path d="M21 43V29q0-8 8-8h14"/><path d="M53 21h.1"/>' },
    { key: "hjerte", svg: '<path d="M50 90C26 74 6 58 6 34 6 18 18 8 31 8c9 0 15 5 19 12 4-7 10-12 19-12 13 0 25 10 25 26 0 24-20 40-44 56z"/>',
      glans: '<path d="M18 40C17 29 22 22 31 21"/><path d="M40 23.5h.1"/>' },
  ];
  const FARVER = [
    { key: "roed", hex: "#ff6b6b" }, { key: "gul", hex: "#ffd84d" }, { key: "groen", hex: "#7fd77a" },
    { key: "blaa", hex: "#6cb6ff" }, { key: "lilla", hex: "#b48cf0" }, { key: "orange", hex: "#ffa04a" },
    { key: "lyseroed", hex: "#ff9fd0" },
  ];
  const PYNT = [
    { key: "jordbaer", emoji: "🍓" }, { key: "kirsebaer", emoji: "🍒" },
    { key: "blaabaer", emoji: "🫐" }, { key: "bolsjer", emoji: "🍬" },
  ];
  const KUNDER = ["🐻", "🐰", "🐷", "🐱", "🐶", "🦊", "🐼", "🐸", "🐵", "🦁", "🐯", "🐨"];
  // Hvor pynten ligger på kagen (procent af 100×100-boksen), efter antal
  const PLADS = {
    1: [[50, 50]], 2: [[34, 48], [66, 48]], 3: [[50, 32], [33, 62], [67, 62]],
    4: [[34, 34], [66, 34], [34, 64], [66, 64]], 5: [[33, 33], [67, 33], [33, 65], [67, 65], [50, 49]],
  };
  // Sværhedsgrader: form-valg, antal glasurskåle, antal pyntekrukker, højeste antal pynt
  const NIV = [
    { form: false, farver: 2, typer: 1, max: 2 },
    { form: false, farver: 3, typer: 2, max: 3 },
    { form: true, farver: 3, typer: 3, max: 4 },
    { form: true, farver: 4, typer: 4, max: 5 },
  ];
  const nivFra = n => n < 2 ? 0 : n < 5 ? 1 : n < 9 ? 2 : 3;

  // Tekster til reservestemmen (samme som i lav_lyd.py)
  const T = {
    "bag-hej": "Velkommen til bageriet! Lad os bage kager.",
    "bag-kunde-0": "Hej! Må jeg få en kage?",
    "bag-kunde-1": "Hej bager! Jeg er så sulten.",
    "bag-kunde-2": "Goddag! Jeg vil gerne købe en kage.",
    "bag-se": "Se på boblen. Sådan skal kagen se ud.",
    "bag-form": "Hvilken form skal kagen have?",
    "bag-rund": "Rund!", "bag-firkant": "Firkantet!", "bag-hjerte": "Et hjerte!",
    "bag-dej": "Tryk på skålen, og hæld dejen i.",
    "bag-ovn": "Nu skal kagen i ovnen. Tryk på ovnen!",
    "bag-ding": "Ding! Kagen er færdig!",
    "bag-glasur": "Hvilken farve glasur skal kagen have?",
    "bag-pynt": "Hvad skal der på kagen?",
    "bag-jordbaer": "Jordbær!", "bag-kirsebaer": "Kirsebær!", "bag-blaabaer": "Blåbær!", "bag-bolsjer": "Bolsjer!",
    "bag-hvor-mange": "Hvor mange skal der på? Tryk på krukken.",
    "bag-passer": "Det passer!",
    "bag-mus": "Hov, én for meget! Musen tager den.",
    "bag-giv": "Kagen er klar! Tryk på kagen, og giv den til kunden.",
    "bag-tak-0": "Den er lækker! Tusind tak!",
    "bag-tak-1": "Hvor er den flot! Tak, bager!",
    "bag-tak-2": "Den ser lækker ud! Tak skal du have!",
    "bag-se-igen": "Hov, se på boblen igen.",
    // Hele sætninger til "hvad vil kunden have?" (i stedet for "Kunden vil have" + "rød")
    "bag-vil-have-rund": "Kunden vil have en rund kage.",
    "bag-vil-have-firkant": "Kunden vil have en firkantet kage.",
    "bag-vil-have-hjerte": "Kunden vil have en kage som et hjerte.",
    "bag-vil-have-roed": "Kunden vil have rød glasur.", "bag-vil-have-gul": "Kunden vil have gul glasur.",
    "bag-vil-have-groen": "Kunden vil have grøn glasur.", "bag-vil-have-blaa": "Kunden vil have blå glasur.",
    "bag-vil-have-lilla": "Kunden vil have lilla glasur.", "bag-vil-have-orange": "Kunden vil have orange glasur.",
    "bag-vil-have-lyseroed": "Kunden vil have lyserød glasur.",
    "bag-vil-have-jordbaer": "Kunden vil have jordbær på.", "bag-vil-have-kirsebaer": "Kunden vil have kirsebær på.",
    "bag-vil-have-blaabaer": "Kunden vil have blåbær på.", "bag-vil-have-bolsjer": "Kunden vil have bolsjer på.",
    "bag-vil-have-1": "Kunden vil have én på kagen.", "bag-vil-have-2": "Kunden vil have to på kagen.",
    "bag-vil-have-3": "Kunden vil have tre på kagen.", "bag-vil-have-4": "Kunden vil have fire på kagen.",
    "bag-vil-have-5": "Kunden vil have fem på kagen.",
    "bag-fest": "Fem glade kunder! Sikke en fest!",
    "farve-roed": "rød", "farve-gul": "gul", "farve-groen": "grøn", "farve-blaa": "blå",
    "farve-lilla": "lilla", "farve-orange": "orange", "farve-lyseroed": "lyserød",
    "tal-1": "Én!", "tal-2": "To!", "tal-3": "Tre!", "tal-4": "Fire!", "tal-5": "Fem!",
    "ros-0": "Super!", "ros-1": "Flot klaret!", "ros-2": "Sejt!", "ros-3": "Du er god til det!", "ros-4": "Wow!",
  };
  const PROMPT = { form: "bag-form", dej: "bag-dej", ovn: "bag-ovn", glasur: "bag-glasur", type: "bag-pynt", antal: "bag-hvor-mange", giv: "bag-giv" };

  Spil.css("css-bageriet", `
    .bg{position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;
      --k:clamp(86px,17vh,150px);--kage:min(44vh,42vw,430px);--mini:min(23vh,22vw,200px);--dyr:min(25vh,19vw,220px);
      background:repeating-linear-gradient(90deg,#ffeaf0 0 clamp(26px,4vw,44px),#fff6f8 clamp(26px,4vw,44px) clamp(52px,8vw,88px))}
    @media (max-aspect-ratio:1/1){
      .bg{--k:min(20vw,13vh,140px);--kage:min(34vh,76vw,420px);--mini:min(19vh,36vw,200px);--dyr:min(17vh,32vw,180px)}
    }
    /* Markise foroven: røde og hvide striber med buet kant */
    .bg::before{content:"";position:absolute;left:0;right:0;top:0;height:calc(3.4vh + env(safe-area-inset-top,0px));z-index:0;
      background:repeating-linear-gradient(90deg,#ff7b8a 0 40px,#fff 40px 80px);
      -webkit-mask:radial-gradient(22px 12px at 20px 100%,transparent 98%,#000) 0 0/40px 100%;
      mask:radial-gradient(22px 12px at 20px 100%,transparent 98%,#000) 0 0/40px 100%}
    .bg-top{position:relative;z-index:2;flex:none;display:flex;align-items:center;justify-content:center;
      height:calc(2vh + clamp(52px,8.5vh,78px));padding-top:calc(1.5vh + env(safe-area-inset-top,0px));box-sizing:border-box;
      padding-inline:calc(clamp(52px,8.5vh,78px) + 26px)}
    .bg-moenter{display:flex;gap:clamp(3px,1vw,12px);background:#fffdf7d9;border-radius:999px;padding:6px clamp(8px,2vw,14px);
      box-shadow:0 4px 0 rgba(31,58,95,.12)}
    /* Mønterne tegnes: tom plads = stiplet ring, fået mønt = guldmønt med kant og glans */
    .bg-moenter span{display:block;width:clamp(20px,min(3.8vh,5.6vw),36px);aspect-ratio:1;border-radius:50%;box-sizing:border-box;
      border:max(2px,.3vh) dashed #d9c2a0;transition:transform .25s}
    .bg-moenter span.on,.bg-flyv{border:0;border-radius:50%;
      background:radial-gradient(circle at 34% 30%,#fffbe0 0 11%,transparent 12%),radial-gradient(circle,#ffd84d 0 50%,#eeb021 51% 58%,#ffd84d 59%);
      box-shadow:inset 0 -3px 0 #d99a1a,0 2px 0 #b97a12}
    .bg-moenter span.on{animation:bg-plop .4s}
    .bg-sig{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(52px,8.5vh,78px);aspect-ratio:1;border-radius:50%;background:var(--sun);box-shadow:0 6px 0 #d9a21a;
      font-size:clamp(24px,4vh,38px);z-index:5}
    .bg-sig:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}

    /* Bagerkringlen: det gyldne bageriskilt hænger på den tomme væg (kun på bred skærm). Tryk = den svinger. */
    .bg-kringle{position:absolute;z-index:2;left:40%;top:calc(3.5vh + clamp(52px,8.5vh,78px) + env(safe-area-inset-top,0px));
      width:min(22vh,18vw,220px);margin-left:calc(min(22vh,18vw,220px) / -2);
      transform-origin:50% 0;cursor:pointer;filter:drop-shadow(0 8px 6px rgba(110,60,20,.18))}
    .bg-kringle svg{display:block;width:100%;height:auto;overflow:visible}
    .bg-kringle.sving{animation:bg-sving 1.4s ease-in-out}
    @keyframes bg-sving{15%{transform:rotate(9deg)}40%{transform:rotate(-6deg)}65%{transform:rotate(3deg)}85%{transform:rotate(-1deg)}}
    @media (max-aspect-ratio:1/1){.bg-kringle{display:none}}

    /* Scenen: kunde + taleboble, kagen på disken, valgene på disken nederst */
    .bg-scene{flex:1;min-height:0;display:grid;position:relative;z-index:1;
      padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
      grid-template-columns:minmax(0,38fr) minmax(0,62fr);grid-template-rows:auto minmax(0,1fr) auto;
      grid-template-areas:"boble arbejde" "kunde arbejde" "valg valg"}
    @media (max-aspect-ratio:1/1){
      .bg-scene{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);grid-template-areas:"kunde boble" "arbejde arbejde" "valg valg"}
    }

    .bg-kunde{grid-area:kunde;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;min-height:0}
    .bg-kunde span{display:block;font-size:var(--dyr);line-height:1;margin-bottom:-.14em;cursor:pointer;
      filter:drop-shadow(0 8px 10px rgba(31,58,95,.18))}
    .bg-kunde span.ind{animation:bg-ind .9s ease-out}
    .bg-kunde span.ud{transition:transform .8s ease-in;transform:translateX(-80vw)}
    .bg-kunde span.spis{animation:bg-spis .9s ease-in-out}
    .bg-kunde span.glad{animation:bg-hop .6s ease-out 2}
    @keyframes bg-ind{0%{transform:translateX(-70vw)}20%{transform:translateX(-52vw) translateY(-6%)}40%{transform:translateX(-35vw)}
      60%{transform:translateX(-18vw) translateY(-6%)}80%{transform:translateX(0)}90%{transform:translateY(-4%)}}
    @keyframes bg-spis{20%,60%{transform:scale(1.12,.88)}40%,80%{transform:scale(.94,1.08)}}
    @keyframes bg-hop{40%{transform:translateY(-16%) rotate(-6deg)}}

    .bg-boble{grid-area:boble;justify-self:center;align-self:start;position:relative;margin-top:1vh;
      background:#fff;border-radius:clamp(20px,3vh,32px);padding:clamp(8px,1.6vh,16px);
      box-shadow:0 8px 0 rgba(31,58,95,.12);transform:scale(0);transform-origin:50% 120%;transition:transform .35s cubic-bezier(.3,1.5,.6,1);cursor:pointer}
    .bg-boble.vis{transform:scale(1)}
    .bg-boble::after{content:"";position:absolute;left:50%;bottom:-16px;margin-left:-14px;border:14px solid transparent;border-bottom:0;border-top:18px solid #fff}
    .bg-boble.vrik{animation:bg-vrik .5s}
    @media (max-aspect-ratio:1/1){
      /* På telefonen står kunden ikke bag den store disk, så den får sin egen lille disk at kigge over.
         Kun bunden klippes, så ører og kinder ikke skæres af i siderne. */
      .bg-kunde{position:relative;overflow:visible;clip-path:inset(-50vh -50vw 0 -50vw);padding-bottom:clamp(8px,1.2vh,12px)}
      .bg-kunde::after{content:"";position:absolute;left:calc(-1 * max(16px,env(safe-area-inset-left,0px)));right:4px;bottom:0;
        height:clamp(24px,3.4vh,32px);border-radius:0 12px 12px 0;z-index:1;
        background:linear-gradient(180deg,#f2c999 0 6px,#c98a56 6px 10px,#e6b07c 10px,#d99c66);box-shadow:0 5px 0 rgba(110,60,20,.25)}
      .bg-boble{align-self:center;transform-origin:-10% 60%}
      .bg-boble::after{left:-16px;top:50%;bottom:auto;margin:-14px 0 0;border:14px solid transparent;border-left:0;border-right:18px solid #fff}
    }
    @keyframes bg-vrik{25%{transform:rotate(-5deg) scale(1.05)}75%{transform:rotate(5deg) scale(1.05)}}

    .bg-arbejde{grid-area:arbejde;position:relative;display:flex;align-items:flex-end;justify-content:center;min-height:0;padding-bottom:4px}

    /* Kagen, set ovenfra på et fad */
    .bg-kage{--s:var(--kage);position:relative;width:var(--s);aspect-ratio:1;flex:none;
      transition:transform .7s ease-in,opacity .5s;cursor:pointer}
    .bg-boble .bg-kage{--s:var(--mini);cursor:pointer}
    .bg-kage svg{display:block;width:100%;height:100%;overflow:visible}
    .bg-fad{fill:#fff;stroke:#dfe7ee;stroke-width:1.5}
    .bg-fad2{fill:none;stroke:#eef3f7;stroke-width:3}
    .bg-form>*{fill:#cfd8df;stroke:#9eabb6;stroke-width:4;transition:fill .6s,stroke .6s}
    .bg-dej,.bg-glasur{transform-box:fill-box;transform-origin:center}
    .bg-dej{fill:#f6e0ae;transform:scale(0);transition:transform .4s cubic-bezier(.3,1.6,.6,1),fill 3s linear}
    .bg-kage.dej-1 .bg-dej{transform:scale(.5)}
    .bg-kage.dej-2 .bg-dej{transform:scale(.75)}
    .bg-kage.dej-3 .bg-dej{transform:scale(.9)}
    .bg-kage.bagt .bg-dej{fill:#dba566}
    .bg-kage.bagt .bg-form>*{fill:#c98a4c;stroke:#ad6f36}
    .bg-glasur{fill:var(--glasur,#fff);stroke:rgba(0,0,0,.1);stroke-width:3;transform:scale(0);transition:transform .6s ease-out}
    .bg-kage.glaseret .bg-glasur{transform:scale(.9)}
    .bg-glans{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;opacity:0;transition:opacity .6s .3s}
    .bg-kage.glaseret .bg-glans{opacity:.6}
    .bg-pynt{position:absolute;inset:0;pointer-events:none}
    .bg-pynt span{position:absolute;transform:translate(-50%,-50%);font-size:calc(var(--s)*.17);line-height:1;
      animation:bg-falder .35s ease-out;filter:drop-shadow(0 3px 2px rgba(0,0,0,.2))}
    .bg-pynt span.tjek::after{content:"";position:absolute;inset:-14%;border-radius:50%;border:max(3px,calc(var(--s)*.018)) solid #4cbb5c;animation:bg-plop .3s}
    @keyframes bg-falder{from{transform:translate(-50%,-130%) scale(1.3);opacity:0}}
    @keyframes bg-plop{50%{transform:scale(1.35)}}
    .bg-kage.skjult{visibility:hidden}
    .bg-kage.spist{opacity:0}
    .bg-kage.hint,.bg-ovn.hint{animation:bg-puls 1s ease-in-out infinite}
    @keyframes bg-puls{50%{transform:scale(1.05);filter:drop-shadow(0 0 14px #ffd84d)}}

    /* Ovnen */
    .bg-ovn{position:absolute;bottom:4px;left:50%;width:calc(var(--kage)*1.1);aspect-ratio:1/1.02;margin-left:calc(var(--kage)*-.55);
      border-radius:clamp(16px,3vh,30px);background:linear-gradient(180deg,#f1f4f7,#cfd7de);box-shadow:0 10px 0 #9aa6b1,inset 0 -8px 0 rgba(0,0,0,.06);
      display:flex;flex-direction:column;align-items:center;padding:4% 7% 6%;box-sizing:border-box;gap:4%;cursor:pointer;
      animation:bg-ovn-ind .45s cubic-bezier(.3,1.5,.6,1)}
    @keyframes bg-ovn-ind{from{transform:scale(.4);opacity:0}}
    .bg-ovn-knapper{display:flex;gap:8%;width:100%;justify-content:center;align-items:center;height:12%}
    .bg-ovn-knapper i{height:100%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#9aa6b1);box-shadow:0 3px 0 #7d8994}
    .bg-ovn-knapper b{flex:1;max-width:40%;height:60%;border-radius:999px;background:#2c3e50;display:flex;gap:10%;align-items:center;justify-content:center;padding:0 4%}
    .bg-ovn-knapper b em{width:14%;aspect-ratio:1;border-radius:50%;background:#56636f;transition:background .3s}
    .bg-ovn-knapper b em.on{background:#ffb347;box-shadow:0 0 8px #ffb347}
    .bg-ovn-vindue{flex:1;width:100%;border-radius:clamp(12px,2vh,22px);background:#2c3e50;border:clamp(6px,1.2vh,12px) solid #9aa6b1;box-sizing:border-box;
      display:grid;place-items:center;overflow:hidden;position:relative;transition:background .6s}
    .bg-ovn-vindue .bg-kage{--s:calc(var(--kage)*.62)}
    /* I ovnen står kagen i formen på en rist, ikke på serveringsfadet */
    .bg-ovn-vindue .bg-fad,.bg-ovn-vindue .bg-fad2{display:none}
    .bg-ovn-vindue::before{content:"";position:absolute;inset:8% 6%;border-radius:6px;
      border:3px solid rgba(255,255,255,.22);background:repeating-linear-gradient(90deg,transparent 0 calc(8% - 3px),rgba(255,255,255,.22) calc(8% - 3px) 8%)}
    .bg-ovn-greb{flex:none;width:62%;height:5.5%;border-radius:999px;background:linear-gradient(180deg,#fff,#aab5bf);box-shadow:0 4px 0 #7d8994}
    .bg-ovn.taendt .bg-ovn-vindue{background:radial-gradient(circle at 50% 60%,#ffb347,#e2603a 70%,#8a2f1d)}
    .bg-ovn.taendt .bg-ovn-vindue::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 12px,rgba(255,255,255,.08) 12px 14px);animation:bg-varme 1s linear infinite}
    @keyframes bg-varme{to{background-position:0 -28px}}
    .bg-ovn.aaben{transition:transform .35s ease-in,opacity .35s;transform:scale(.6);opacity:0}

    /* Disken med valgene */
    .bg-valg{grid-area:valg;margin-inline:calc(-1 * max(16px,env(safe-area-inset-left,0px)));position:relative;
      display:flex;justify-content:center;align-items:center;gap:clamp(10px,2.4vw,30px);
      height:calc(var(--k) + 4vh + 20px + env(safe-area-inset-bottom,0px));padding:2vh 16px calc(2vh + env(safe-area-inset-bottom,0px));box-sizing:border-box;
      background:linear-gradient(180deg,#c98a56 0 12px,#e6b07c 12px 22%,#d99c66);border-top:6px solid #f2c999;
      box-shadow:0 -6px 14px rgba(110,60,20,.15)}
    .bg-knap{width:var(--k);aspect-ratio:1;border-radius:clamp(18px,3vh,28px);background:var(--card);box-shadow:0 8px 0 rgba(110,60,20,.35);
      display:grid;place-items:center;line-height:1;font-size:calc(var(--k)*.55);transition:transform .15s,opacity .3s;animation:bg-plop .35s ease-out;padding:0}
    .bg-knap:active{transform:scale(.93)}
    .bg-knap svg{width:74%;height:74%;overflow:visible}
    .bg-knap svg *{fill:#cfd8df;stroke:#8d9aa6;stroke-width:5}
    .bg-knap.wrong{animation:bg-ryst .45s}
    .bg-knap.right{background:#fff3c4;box-shadow:0 8px 0 #e3b630;animation:bg-hop .5s}
    .bg-knap.dim{opacity:.35}
    .bg-knap.hint{animation:bg-knap-puls 1s ease-in-out infinite}
    @keyframes bg-knap-puls{50%{transform:scale(1.1);box-shadow:0 0 0 8px #ffe066,0 8px 0 rgba(110,60,20,.35)}}
    @keyframes bg-ryst{20%,60%{transform:translateX(-10px) rotate(-4deg)}40%,80%{transform:translateX(10px) rotate(4deg)}}
    /* Glasurskål set ovenfra */
    .bg-skaal{width:80%;aspect-ratio:1;border-radius:50%;background:#e8f1f8;box-shadow:inset 0 -5px 0 #c9d8e4,0 3px 0 #b7c6d2;display:grid;place-items:center}
    .bg-skaal i{width:74%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 36% 32%,rgba(255,255,255,.55) 0 14%,transparent 15%),var(--c);
      box-shadow:inset 0 -6px 0 rgba(0,0,0,.12)}
    /* Krukke med pynt */
    .bg-krukke{position:relative;width:76%;height:82%;border-radius:18% 18% 24% 24%;background:linear-gradient(90deg,#e4f4ff,#f7fcff 40%,#d6ecfa);
      box-shadow:inset 0 0 0 3px #bcdcf0;display:flex;flex-wrap:wrap-reverse;align-content:flex-start;justify-content:center;padding:6% 4% 10%;box-sizing:border-box;
      font-size:calc(var(--k)*.27);line-height:1}
    /* Pynten ligger i en bunke i bunden af krukken (fuld række nederst) */
    .bg-krukke i{font-style:normal;margin:-3% -1%}
    .bg-krukke::before{content:"";position:absolute;left:-6%;right:-6%;top:-8%;height:16%;border-radius:8px;background:#e86a7a;box-shadow:0 3px 0 #c34f60}
    .bg-knap.stor{width:calc(var(--k)*1.3);height:var(--k);aspect-ratio:auto}
    .bg-knap.stor .bg-krukke{width:84%;font-size:calc(var(--k)*.22)}
    .bg-knap.haeld{animation:bg-haeld .45s}
    @keyframes bg-haeld{40%{transform:rotate(-28deg) translate(-6%,-8%)}}

    .bg-mus{position:absolute;font-size:calc(var(--kage)*.2);line-height:1;transform:translate(-50%,-50%);z-index:4;transition:left .8s linear;pointer-events:none}
    .bg-mus.tilbage{transform:translate(-50%,-50%) scaleX(-1)}
    .bg-flyv{position:fixed;z-index:30;width:clamp(34px,6vh,56px);aspect-ratio:1;transition:transform .75s cubic-bezier(.4,-.3,.6,1);pointer-events:none}

    /* Fest */
    .bg-fest{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3vh;
      background:radial-gradient(90% 70% at 50% 40%,#fff1f6,#ffc7da)}
    .bg-fest .bg-stor-kage{font-size:clamp(90px,24vh,220px);line-height:1;animation:bg-hop 1.2s ease-in-out infinite}
    .bg-fest .bg-dans{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(6px,2vw,26px);padding-inline:16px}
    .bg-fest .bg-dans b{font-size:clamp(46px,11vh,110px);line-height:1;animation:bg-dans 1s ease-in-out infinite}
    @keyframes bg-dans{50%{transform:translateY(-22%) rotate(8deg) scale(1.08)}}

    @media (prefers-reduced-motion:reduce){
      .bg-kunde span.ind,.bg-kunde span.spis,.bg-kunde span.glad,.bg-boble.vrik,.bg-ovn,.bg-knap,.bg-knap.wrong,.bg-knap.right,
      .bg-knap.hint,.bg-kage.hint,.bg-ovn.hint,.bg-fest b,.bg-fest .bg-stor-kage,.bg-pynt span,.bg-moenter span.on,
      .bg-ovn.taendt .bg-ovn-vindue::after,.bg-kringle.sving{animation:none}
      .bg-kunde span.ud,.bg-mus,.bg-flyv,.bg-kage,.bg-dej,.bg-glasur{transition:none}
      .bg-knap.hint,.bg-kage.hint,.bg-ovn.hint{outline:6px solid #ffd84d;outline-offset:4px}
    }
  `);

  let root, alive, timers, ordre, kage, trin, travl, forkert, moenter, kunde, sidstKunde, sidstAntal,
    total, sessionDone, startNiv, serverede, ordreNr, idle1, idle2, graceVer, test;
  const later = (fn, ms) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const q = sel => root.querySelector(sel);
  const pick = a => a[Math.random() * a.length | 0];
  const once = fn => { let d = false; return () => { if (!d) { d = true; fn(); } }; };
  const sig = (keys, done) => Spil.say(keys.map(k => T[k] || "").join(" "), done, keys);
  const niveau = () => NIV[Math.max(startNiv, nivFra(sessionDone))];

  /* ---------- Tegning af kagen ---------- */
  function kageHTML(form) {
    const s = form ? form.svg : "";
    // Formen tegnes lidt mindre end fadet (skala .8), så hjørnerne på den firkantede er inde på fadet
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="bg-fad" cx="50" cy="50" r="49"/><circle class="bg-fad2" cx="50" cy="50" r="42"/>
      <g transform="translate(50 50) scale(.8) translate(-50 -50)">
        <g class="bg-form">${s}</g><g class="bg-dej">${s}</g><g class="bg-glasur">${s}</g><g class="bg-glans">${form ? form.glans : ""}</g>
      </g></svg><div class="bg-pynt"></div>`;
  }
  const pos = ([x, y]) => [50 + (x - 50) * .8, 50 + (y - 50) * .8];

  // Opdater et kage-element ud fra en tilstand {form, dej, bagt, farve, pynt, antal}
  function tegnKage(el, k, plan) {
    const fk = k.form ? k.form.key : "";
    if (el.dataset.form !== fk) { el.dataset.form = fk; el.innerHTML = kageHTML(k.form); }
    el.classList.toggle("dej-1", k.dej === 1);
    el.classList.toggle("dej-2", k.dej === 2);
    el.classList.toggle("dej-3", k.dej >= 3);
    el.classList.toggle("bagt", !!k.bagt);
    el.classList.toggle("glaseret", !!k.farve);
    if (k.farve) el.style.setProperty("--glasur", k.farve.hex);
    // Pynten: læg nye stykker på, fjern dem der er for mange
    const lag = el.querySelector(".bg-pynt"), pl = PLADS[plan] || PLADS[1];
    while (lag.children.length > k.antal) lag.lastChild.remove();
    while (lag.children.length < k.antal) {
      const i = lag.children.length, sp = document.createElement("span");
      const [x, y] = pos(pl[i] || [50, 84]); // et ekstra stykke havner ude på kanten af fadet
      sp.style.left = x + "%"; sp.style.top = y + "%"; sp.textContent = k.pynt.emoji;
      lag.appendChild(sp);
    }
  }
  const arbejdsKage = () => q(".bg-arbejde > .bg-kage");
  const opdater = () => tegnKage(arbejdsKage(), kage, ordre.antal);

  function tegnMoenter() {
    q(".bg-moenter").innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < moenter ? "on" : ""}"></span>`).join("");
  }

  /* ---------- Idle: gentag opgaven, og vis derefter hvad der er rigtigt ---------- */
  function stopIdle() { clearTimeout(idle1); clearTimeout(idle2); }
  function nulstilIdle() {
    stopIdle();
    if (!trin) return;
    idle1 = later(() => { if (!Spil.isTalking()) sig([PROMPT[trin]]); }, 9000);
    idle2 = later(visHint, 16000);
  }
  function visHint() {
    const el = q('[data-rigtig="1"]');
    if (el) el.classList.add("hint");
  }
  function fjernHint() { root.querySelectorAll(".hint").forEach(e => e.classList.remove("hint")); }

  /* ---------- En ny kunde ---------- */
  function nyKunde(direkte) {
    if (!alive) return;
    trin = null; travl = true; ordreNr++;
    const n = niveau();
    const form = n.form ? pick(FORMER) : FORMER[0];
    let antal;
    do { antal = 1 + (Math.random() * n.max | 0); } while (antal === sidstAntal && n.max > 1);
    sidstAntal = antal;
    ordre = { form, farve: pick(FARVER), pynt: pick(PYNT), antal, n };
    kage = { form: n.form ? null : form, dej: 0, bagt: false, farve: null, pynt: null, antal: 0 };

    kunde = pick(KUNDER.filter(k => k !== sidstKunde)); sidstKunde = kunde;
    q(".bg-kunde").innerHTML = `<span class="ind" role="img" aria-label="Kunde">${kunde}</span>`;
    q(".bg-kunde span").onclick = () => trin === "giv" ? giv() : boblePrik();

    // Boblen viser den færdige kage
    const b = q(".bg-boble");
    b.classList.remove("vis");
    b.innerHTML = `<div class="bg-kage"></div>`;
    tegnKage(b.firstChild, { form, dej: 3, bagt: true, farve: ordre.farve, pynt: ordre.pynt, antal }, antal);

    q(".bg-arbejde").innerHTML = `<div class="bg-kage" aria-label="Kagen"></div>`;
    arbejdsKage().onclick = giv;
    opdater();
    q(".bg-valg").innerHTML = "";
    if (direkte) { q(".bg-kunde span").classList.remove("ind"); b.classList.add("vis"); return; }

    Spil.tone([784, 622], .3); // dørklokke
    const nr = ordreNr;
    const videre = once(() => { if (alive && nr === ordreNr && !trin) gaaTil(n.form ? "form" : "dej"); });
    later(() => {
      b.classList.add("vis");
      Spil.sfx.pop();
      sig([pick(["bag-kunde-0", "bag-kunde-1", "bag-kunde-2"]), "bag-se"], videre);
      later(videre, 6500); // kom videre, også hvis replikken afbrydes
    }, 950);
  }

  // Tryk på boblen eller kunden: kunden siger, hvad der skal vælges nu
  function boblePrik() {
    if (!alive || !ordre) return;
    const b = q(".bg-boble");
    b.classList.remove("vrik"); void b.offsetWidth; b.classList.add("vrik");
    sig([vilHave() || "bag-se"]);
  }
  // Hel sætning med det, kunden vil have på det nuværende trin ("Kunden vil have rød glasur.")
  function vilHave() {
    const svar = { form: ordre.form.key, glasur: ordre.farve.key, type: ordre.pynt.key, antal: ordre.antal }[trin];
    return svar ? "bag-vil-have-" + svar : null;
  }

  /* ---------- Trinene ---------- */
  function gaaTil(t, foer = []) {
    if (!alive) return;
    trin = t; forkert = 0; travl = false;
    fjernHint();
    const v = q(".bg-valg");
    v.innerHTML = "";
    const knap = (html, rigtig, fn, label, ekstra = "") => {
      const b = document.createElement("button");
      b.className = "bg-knap " + ekstra; b.innerHTML = html; b.setAttribute("aria-label", label);
      if (rigtig) b.dataset.rigtig = "1";
      b.onclick = () => fn(b);
      v.appendChild(b);
      return b;
    };
    const n = ordre.n;

    if (t === "form") {
      Spil.shuffle(FORMER.slice()).forEach(f =>
        knap(`<svg viewBox="0 0 100 100">${f.svg}</svg>`, f === ordre.form, b => vaelg(b, f === ordre.form, "bag-" + f.key, "bag-" + ordre.form.key, () => {
          kage.form = f; opdater(); gaaTil("dej", ["bag-" + f.key]);
        }), f.key));
    } else if (t === "dej") {
      knap("🥣", true, haeldDej, "Dej", "stor");
    } else if (t === "ovn") {
      visOvn();
    } else if (t === "glasur") {
      const valg = Spil.shuffle([ordre.farve, ...Spil.shuffle(FARVER.filter(f => f !== ordre.farve)).slice(0, n.farver - 1)]);
      valg.forEach(f => knap(`<div class="bg-skaal" style="--c:${f.hex}"><i></i></div>`, f === ordre.farve,
        b => vaelg(b, f === ordre.farve, "farve-" + f.key, "farve-" + ordre.farve.key, () => {
          kage.farve = f; opdater(); Spil.sfx.right();
          if (n.typer > 1) gaaTil("type", ["farve-" + f.key]);
          else { kage.pynt = ordre.pynt; gaaTil("antal", ["farve-" + f.key]); }
        }), "Glasur " + f.key));
    } else if (t === "type") {
      const valg = Spil.shuffle([ordre.pynt, ...Spil.shuffle(PYNT.filter(p => p !== ordre.pynt)).slice(0, n.typer - 1)]);
      valg.forEach(p => knap(`<div class="bg-krukke">${`<i>${p.emoji}</i>`.repeat(3)}</div>`, p === ordre.pynt,
        b => vaelg(b, p === ordre.pynt, "bag-" + p.key, "bag-" + ordre.pynt.key, () => {
          kage.pynt = p; gaaTil("antal", ["bag-" + p.key]);
        }), p.key));
    } else if (t === "antal") {
      const e = ordre.pynt.emoji;
      knap(`<div class="bg-krukke">${`<i>${e}</i>`.repeat(5)}</div>`, true, laegPaa, "Læg på kagen", "stor");
    } else if (t === "giv") {
      arbejdsKage().dataset.rigtig = "1";
    }
    sig([...foer, PROMPT[t]]);
    nulstilIdle();
  }

  // Et valg (form, glasur, pynt): rigtigt -> videre, forkert -> blid hjælp
  function vaelg(btn, rigtig, valgtKey, rigtigKey, videre) {
    if (!alive || travl) return;
    nulstilIdle();
    if (rigtig) {
      travl = true; stopIdle();
      btn.classList.add("right");
      [...q(".bg-valg").children].forEach(c => c !== btn && c.classList.add("dim"));
      Spil.burstAt(btn, "✨⭐✨⭐✨");
      later(videre, 450);
      return;
    }
    forkert++;
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    const b = q(".bg-boble");
    b.classList.remove("vrik"); void b.offsetWidth; b.classList.add("vrik");
    Spil.sfx.wrong();
    // Første gang: kig på boblen. Derefter siger kunden svaret, og den rigtige knap blinker.
    if (forkert < 2) sig([valgtKey, "bag-se-igen"]);
    else { sig([vilHave()]); visHint(); }
  }

  function haeldDej(btn) {
    if (!alive || travl || trin !== "dej") return;
    nulstilIdle();
    btn.classList.remove("haeld"); void btn.offsetWidth; btn.classList.add("haeld");
    kage.dej++; opdater();
    Spil.tone([420 + kage.dej * 90, 260], .09, "triangle");
    if (kage.dej >= 3) {
      travl = true; stopIdle();
      Spil.burstAt(arbejdsKage(), "✨⭐✨");
      later(() => gaaTil("ovn", [pick(["ros-0", "ros-1", "ros-2", "ros-4"])]), 600);
    }
  }

  function visOvn() {
    const a = q(".bg-arbejde");
    const ovn = document.createElement("div");
    ovn.className = "bg-ovn"; ovn.dataset.rigtig = "1"; ovn.setAttribute("aria-label", "Ovnen"); ovn.setAttribute("role", "button");
    ovn.innerHTML = `<div class="bg-ovn-knapper"><i></i><b>${"<em></em>".repeat(5)}</b><i></i></div>
      <div class="bg-ovn-greb"></div><div class="bg-ovn-vindue"><div class="bg-kage"></div></div>`;
    a.appendChild(ovn);
    tegnKage(ovn.querySelector(".bg-kage"), kage, ordre.antal);
    arbejdsKage().classList.add("skjult");
    ovn.onclick = bag;
  }

  function bag() {
    if (!alive || travl || trin !== "ovn") return;
    travl = true; stopIdle(); fjernHint();
    const ovn = q(".bg-ovn"), lys = ovn.querySelectorAll("em");
    ovn.classList.add("taendt");
    Spil.tone([300, 380], .12, "sawtooth");
    // Kagen i vinduet bliver gyldenbrun (fill-overgang på 3 sek.)
    kage.bagt = true;
    later(() => tegnKage(ovn.querySelector(".bg-kage"), kage, ordre.antal), 50);
    opdater();
    lys.forEach((l, i) => later(() => { l.classList.add("on"); Spil.tone([1250], .03, "square"); }, 300 + i * 620));
    later(() => {
      Spil.tone([1568, 1319, 1568], .22); // ding
      ovn.classList.add("aaben");
      later(() => {
        ovn.remove();
        const k = arbejdsKage();
        k.classList.remove("skjult");
        Spil.burstAt(k, "✨⭐✨⭐");
        gaaTil("glasur", ["bag-ding"]);
      }, 380);
    }, 3500);
  }

  function laegPaa() {
    if (!alive || travl || trin !== "antal") return;
    nulstilIdle(); fjernHint();
    kage.antal++; opdater();
    const n = kage.antal, my = ++graceVer;
    Spil.sfx.pop();
    if (n <= ordre.antal) {
      q(`.bg-boble .bg-pynt span:nth-child(${n})`)?.classList.add("tjek");
      sig(["tal-" + n]);
    }
    if (n === ordre.antal) {
      // Kort pause: trykker barnet ikke mere, passer det
      later(() => {
        if (my !== graceVer || trin !== "antal" || kage.antal !== ordre.antal) return;
        travl = true; stopIdle();
        Spil.sfx.right();
        Spil.burstAt(arbejdsKage(), "✨⭐✨⭐✨");
        later(() => gaaTil("giv", ["bag-passer"]), 300);
      }, 1500);
    } else if (n > ordre.antal) {
      // Én for meget: en mus kommer og tager den
      travl = true; stopIdle();
      const sp = arbejdsKage().querySelector(".bg-pynt").lastChild;
      mus(sp);
      const faerdig = once(() => {
        if (!alive || trin !== "antal") return;
        gaaTil("giv", ["tal-" + ordre.antal, "bag-passer"]);
      });
      later(() => sig(["bag-mus"], () => later(faerdig, 900)), 200);
      later(faerdig, 5200);
    }
  }

  function mus(sp) {
    const a = q(".bg-arbejde"), ar = a.getBoundingClientRect(), sr = sp.getBoundingClientRect();
    const m = document.createElement("div");
    m.className = "bg-mus"; m.textContent = "🐁";
    m.style.top = (sr.top - ar.top + sr.height / 2) + "px";
    m.style.left = (innerWidth - ar.left + 60) + "px";
    a.appendChild(m);
    later(() => { m.style.left = (sr.left - ar.left + sr.width / 2) + "px"; }, 40);
    later(() => {
      kage.antal = ordre.antal; opdater();
      Spil.tone([1400, 1700], .05, "square");
      m.classList.add("tilbage");
      m.style.left = (innerWidth - ar.left + 80) + "px";
    }, 900);
    later(() => m.remove(), 1800);
  }

  function giv() {
    if (!alive || travl || trin !== "giv") return;
    travl = true; stopIdle(); fjernHint(); trin = null;
    const k = arbejdsKage(), dyr = q(".bg-kunde span");
    const kr = k.getBoundingClientRect(), dr = dyr.getBoundingClientRect();
    const dx = dr.left + dr.width / 2 - (kr.left + kr.width / 2), dy = dr.top + dr.height * .62 - (kr.top + kr.height / 2);
    k.style.transform = `translate(${dx}px,${dy}px) scale(.4)`;
    q(".bg-boble").classList.remove("vis");
    later(() => {
      dyr.classList.remove("ind"); dyr.classList.add("spis");
      k.classList.add("spist");
      [0, 260, 520].forEach(t => later(() => Spil.tone([240, 200], .07, "square"), t));
    }, 720);
    later(() => {
      dyr.classList.remove("spis"); dyr.classList.add("glad");
      Spil.burstAt(dyr, "💖✨💖✨💖");
      sig([pick(["bag-tak-0", "bag-tak-1", "bag-tak-2"])]);
      moent(dyr);
    }, 1650);
    later(() => {
      sessionDone++; total++;
      if (!test) try { localStorage.setItem("lk-bageri", String(total)); } catch (e) {}
      serverede.push(kunde);
      if (moenter >= 5) {
        // Lad kundens tak tale færdig, før festen begynder (højst 2,5 sek. ekstra)
        const start = once(fest);
        const vent = () => Spil.isTalking() ? later(vent, 150) : start();
        vent(); later(start, 2500);
      } else kundeGaar();
    }, 4000);
  }

  function moent(fra) {
    const slot = q(`.bg-moenter span:nth-child(${moenter + 1})`);
    moenter++;
    if (!slot) return;
    const fr = fra.getBoundingClientRect(), tr = slot.getBoundingClientRect();
    const c = document.createElement("div");
    c.className = "bg-flyv";
    c.style.left = (fr.left + fr.width / 2 - 24) + "px"; c.style.top = (fr.top + fr.height * .3) + "px";
    root.appendChild(c);
    later(() => { c.style.transform = `translate(${tr.left - fr.left - fr.width / 2 + 24}px,${tr.top - fr.top - fr.height * .3}px) scale(.7)`; }, 40);
    later(() => { c.remove(); slot.classList.add("on"); Spil.tone([988, 1319], .1); }, 820);
  }

  function kundeGaar() {
    const dyr = q(".bg-kunde span");
    if (dyr) { dyr.classList.remove("glad", "ind"); dyr.classList.add("ud"); }
    later(nyKunde, 900);
  }

  function fest() {
    const p = document.createElement("div");
    p.className = "bg-fest";
    p.innerHTML = `<div class="bg-stor-kage">🎂</div><div class="bg-dans">${serverede.slice(-5)
      .map((d, i) => `<b style="animation-delay:${(i * .13).toFixed(2)}s">${d}</b>`).join("")}</div>`;
    root.appendChild(p);
    Spil.sfx.fanfare();
    sig(["bag-fest"]);
    const konfetti = () => Spil.burst(innerWidth * (.2 + Math.random() * .6), innerHeight * (.2 + Math.random() * .5), "🎉⭐🧁✨🎊🍓");
    konfetti(); later(konfetti, 500); later(konfetti, 1000); later(konfetti, 1600);
    p.onpointerdown = e => { Spil.sfx.pop(); Spil.burst(e.clientX, e.clientY, "🎉⭐🧁✨🎊🍓"); };
    later(() => { p.remove(); moenter = 0; tegnMoenter(); kundeGaar(); }, 4600);
  }

  /* ---------- Dybe links til test (index.html?spil=bageriet&dyb=...) ----------
     Spring direkte til et trin med en fuld ordre (form, 4 glasurer, 4 slags pynt):
     form, dej, ovn, bager (ovnen er tændt), glasur, pynt, antal, mus (én for meget), giv, fest,
     moenter (giv-trinnet med tre mønter).
     Tilføj "-rund", "-firkant" eller "-hjerte" for at vælge kageform (fx "giv-hjerte").
     Ved dybe links gemmes intet i localStorage. */
  function dybtLink(d) {
    // festklar: giv-trinnet med fire mønter, så næste kage giver fest
    if (d === "festklar") { dybtLink("giv"); moenter = 4; tegnMoenter(); return; }
    const [t, f] = d.split("-");
    startNiv = 3;
    nyKunde(true);
    const form = FORMER.find(x => x.key === f);
    if (form) {
      ordre.form = form;
      tegnKage(q(".bg-boble .bg-kage"), { form, dej: 3, bagt: true, farve: ordre.farve, pynt: ordre.pynt, antal: ordre.antal }, ordre.antal);
    }
    if (t === "mus" || t === "antal") ordre.antal = Math.max(ordre.antal, 2);
    const trinOrden = ["form", "dej", "ovn", "glasur", "pynt", "antal", "giv"];
    const maal = t === "bager" ? "ovn" : t === "mus" ? "antal" : t === "fest" || t === "moenter" ? "giv" : t;
    const i = Math.max(0, trinOrden.indexOf(maal));
    if (i > 0) kage.form = ordre.form;
    if (i > 1) kage.dej = 3;
    if (i > 2) kage.bagt = true;
    if (i > 3) kage.farve = ordre.farve;
    if (i > 4) kage.pynt = ordre.pynt;
    if (i > 5) kage.antal = ordre.antal;
    opdater();
    if (t === "fest") {
      moenter = 5; tegnMoenter();
      serverede = Spil.shuffle(KUNDER.slice()).slice(0, 5);
      fest();
      return;
    }
    if (t === "moenter") { moenter = 3; tegnMoenter(); } // tre mønter i forvejen
    gaaTil(maal === "pynt" ? "type" : maal);
    if (t === "bager") { travl = false; bag(); }
    if (t === "mus") { kage.antal = ordre.antal - 1; opdater(); laegPaa(); later(laegPaa, 200); }
  }

  Spil.register({
    id: "bageriet", navn: "Bageriet", ikon: "🧁", farve: "#ffd6e5",
    start(r) {
      Spil.preload(Object.keys(T));
      root = r; alive = true; timers = []; travl = true; trin = null; ordre = null;
      moenter = 0; sidstKunde = null; sidstAntal = 0; sessionDone = 0; serverede = []; ordreNr = 0; graceVer = 0;
      total = 0;
      try { total = parseInt(localStorage.getItem("lk-bageri"), 10) || 0; } catch (e) {}
      // Start ét trin under det, man nåede sidst, så det er let at komme i gang
      startNiv = Math.max(0, nivFra(total) - 1);
      root.innerHTML = `<div class="bg">
        <div class="bg-top"><div class="bg-moenter" aria-label="Mønter"></div></div>
        <button class="bg-sig" aria-label="Sig det igen">🔊</button>
        <div class="bg-kringle" aria-hidden="true"><svg viewBox="0 0 100 118">
          <path d="M50 6L22 40M50 6L78 40" fill="none" stroke="#7a5a3a" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="50" cy="6" r="4" fill="#d9a21a" stroke="#7a5a3a" stroke-width="2"/>
          <g transform="translate(0 36)" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M37 42L68 70C92 66 98 34 80 20 68 10 54 16 50 28 46 16 32 10 20 20 2 34 8 66 32 70L63 42" stroke="#b06a24" stroke-width="17"/>
            <path d="M37 42L68 70C92 66 98 34 80 20 68 10 54 16 50 28 46 16 32 10 20 20 2 34 8 66 32 70L63 42" stroke="#f0ae4e" stroke-width="12"/>
            <path d="M78 26C88 36 88 54 78 62M22 26C12 36 12 54 22 62" stroke="#ffd98a" stroke-width="3.5" opacity=".8"/>
            <g fill="#fff" stroke="none"><circle cx="18" cy="38" r="1.6"/><circle cx="26" cy="24" r="1.4"/><circle cx="82" cy="40" r="1.6"/>
              <circle cx="72" cy="22" r="1.4"/><circle cx="40" cy="20" r="1.3"/><circle cx="60" cy="20" r="1.3"/><circle cx="20" cy="56" r="1.4"/><circle cx="82" cy="58" r="1.4"/></g>
          </g></svg></div>
        <div class="bg-scene">
          <div class="bg-boble" aria-label="Kunden vil have denne kage"></div>
          <div class="bg-kunde"></div>
          <div class="bg-arbejde"></div>
          <div class="bg-valg"></div>
        </div></div>`;
      tegnMoenter();
      q(".bg-sig").onclick = () => { if (trin) sig([PROMPT[trin]]); else if (ordre) sig(["bag-se"]); };
      q(".bg-boble").onclick = boblePrik;
      const kr = q(".bg-kringle");
      kr.onclick = () => { kr.classList.remove("sving"); void kr.offsetWidth; kr.classList.add("sving"); Spil.tone([1319, 1047], .12); };
      test = !!Spil.dyb;
      if (test) { dybtLink(Spil.dyb); return; }
      const foerste = once(() => alive && nyKunde());
      sig(["bag-hej"], foerste);
      later(foerste, 4200);
    },
    stop() { alive = false; timers.forEach(clearTimeout); stopIdle(); }
  });
})();
