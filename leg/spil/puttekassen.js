// Spil: Puttekassen — barnet trækker klodser hen til de rigtige huller i låget på en legetøjskasse i træ.
// To måder at spille på, som begge virker hele tiden:
//   1) Træk en klods med fingeren hen til hullet (pointer events + setPointerCapture, touch-action:none).
//   2) Tryk på en klods (stemmen siger formen, og det rigtige hul lyser) og tryk derefter på hullet,
//      så hopper klodsen selv derhen og ned i kassen. Godt for de mindste, der ikke kan trække endnu.
// Ingen tabe-tilstand: forkerte slip giver en blid lyd, en venlig replik og et vink om det rigtige hul.
// Når kassen er fuld, rasler den, låget åbner, og et dyr dukker op nede i kassen og siger, hvem det er. Så vælter klodserne ud igen
// med én ny form ad gangen (3 → 4 → 5 → 6) og hullerne i en ny rækkefølge.
(function () {
  /* ---------- Former (viewBox 0 0 100 100) ---------- */
  const P = {
    cirkel: "M50 9 A41 41 0 1 1 50 91 A41 41 0 1 1 50 9 Z",
    firkant: "M20 10 H80 A10 10 0 0 1 90 20 V80 A10 10 0 0 1 80 90 H20 A10 10 0 0 1 10 80 V20 A10 10 0 0 1 20 10 Z",
    trekant: "M50 11 L92 86 L8 86 Z",
    stjerne: "M50 8 L60.6 37.4 L91.9 38.4 L67.1 57.6 L75.9 87.6 L50 70 L24.1 87.6 L32.9 57.6 L8.1 38.4 L39.4 37.4 Z",
    hjerte: "M50 90 C20 68 8 52 8 36 C8 21 20 12 32 12 C41 12 47 18 50 25 C53 18 59 12 68 12 C80 12 92 21 92 36 C92 52 80 68 50 90 Z",
    maane: "M81 16 A40 40 0 1 0 81 84 A34 34 0 0 1 81 16 Z" // midt i feltet og fyldig nok til at ligne en måne
  };
  // farve, lys (til 3D-skær) og mørk (kant) hører til formen, så barnet kan kende den igen
  const INFO = {
    cirkel: { navn: "Cirklen", lyd: "putte-cirkel", farve: "#ff6b6b", lys: "#ffb3b3", moerk: "#c93a3a" },
    firkant: { navn: "Firkanten", lyd: "putte-firkant", farve: "#4d96ff", lys: "#a9cbff", moerk: "#2a63b8" },
    trekant: { navn: "Trekanten", lyd: "putte-trekant", farve: "#ffc93c", lys: "#ffe393", moerk: "#c99a10" },
    stjerne: { navn: "Stjernen", lyd: "putte-stjerne", farve: "#b57dff", lys: "#dcc4ff", moerk: "#7a41c9" },
    hjerte: { navn: "Hjertet", lyd: "putte-hjerte", farve: "#ff7ab8", lys: "#ffb9d8", moerk: "#cc3f85" },
    maane: { navn: "Månen", lyd: "putte-maane", farve: "#6bcb77", lys: "#b2e8b8", moerk: "#3d8f4d" }
  };
  const ORDEN = ["cirkel", "firkant", "trekant", "stjerne", "hjerte", "maane"];
  // Overraskelsen i kassen: dyr med en færdig "ja-<dyr>"-replik ("Ja! Koen siger muh!")
  // [emoji, lydnøgle (ja-<nøgle> findes i lyd/), replik hvis lydfilen mangler]
  const DYR = [
    ["🐄", "ko", "Ja! Koen siger muh!"], ["🐈", "kat", "Ja! Katten siger miav!"],
    ["🐕", "hund", "Ja! Hunden siger vov vov!"], ["🐖", "gris", "Ja! Grisen siger øf øf!"],
    ["🦆", "and", "Ja! Anden siger rap rap!"], ["🐑", "faar", "Ja! Fåret siger mææh!"],
    ["🐎", "hest", "Ja! Hesten siger ihahaha!"], ["🦁", "loeve", "Ja! Løven siger roaaar!"],
    ["🐸", "froe", "Ja! Frøen siger kvæk kvæk!"], ["🦉", "ugle", "Ja! Uglen siger uhu!"],
    ["🐔", "hoene", "Ja! Hønen siger gok gok!"], ["🐭", "mus", "Ja! Musen siger pip pip!"],
    ["🐘", "elefant", "Ja! Elefanten siger trut!"], ["🐒", "abe", "Ja! Aben siger uh uh ah ah!"],
    ["🐟", "fisk", "Ja! Fisken siger blub blub!"], ["🐝", "bi", "Ja! Bien siger bzzz!"],
    ["🐻", "bjoern", "Ja! Det er en bjørn!"], ["🐍", "slange", "Ja! Slangen siger sssss!"]
  ];

  Spil.css("css-puttekassen", `
    .pk{position:relative;height:100%;box-sizing:border-box;overflow:hidden;
      display:flex;flex-direction:column;
      padding-left:max(14px,env(safe-area-inset-left,0px));
      padding-right:max(14px,env(safe-area-inset-right,0px));
      padding-bottom:max(10px,env(safe-area-inset-bottom,0px));
      touch-action:none;
      /* Lyst børneværelse: væg med stribet tapet, en fodliste og et trægulv, som kassen står på */
      --gulv:50%;
      background:
        radial-gradient(120% 60% at 50% 0%,rgba(255,253,246,.85) 0 30%,rgba(255,253,246,0) 72%) 0 0 / 100% var(--gulv) no-repeat,
        linear-gradient(#fffaf0 0 9px,#e8d6b6 9px 11px,rgba(140,100,55,.28) 11px,rgba(140,100,55,0) 22px) 0 calc(var(--gulv) - 11px) / 100% 34px no-repeat,
        repeating-linear-gradient(90deg,rgba(150,105,55,.2) 0 2px,rgba(0,0,0,0) 2px 12.5%) 0 100% / 100% calc(100% - var(--gulv)) no-repeat,
        linear-gradient(#efe2c8,#e2cfac) 0 100% / 100% calc(100% - var(--gulv)) no-repeat,
        repeating-linear-gradient(90deg,rgba(255,255,255,0) 0 34px,rgba(255,220,170,.28) 34px 52px) 0 0 / 100% var(--gulv) no-repeat,
        #fbf1dc;
      --hul:clamp(84px,min(26vw,12.5vh),150px);
      --klods:calc(var(--hul) * 1.02);
      --luft:clamp(7px,1.3vh,16px);
    }
    @media (min-aspect-ratio:1/1){.pk{--hul:clamp(96px,min(19vh,13vw),170px);--gulv:60%}}

    /* Lyden-igen-knap (hjem-knappen sidder fast oppe til venstre) */
    .pk-sig{position:absolute;z-index:12;top:calc(2vh + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));
      width:clamp(52px,8.5vh,76px);aspect-ratio:1;border-radius:50%;background:var(--sun);
      box-shadow:0 6px 0 #d9a21a;font-size:clamp(24px,4vh,36px)}
    .pk-sig:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}

    /* Scenen: kassen i midten og klodserne rundt om. På telefon står kassen øverst og klodserne nedenunder. */
    .pk-scene{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;
      gap:clamp(6px,1.4vh,20px);flex-direction:column}
    /* På telefon deler begge bakker plads, så klodserne står i pæne rækker under kassen */
    .pk-bakke-par{order:2;flex:0 0 auto;width:100%;display:flex;flex-wrap:wrap;align-items:center;
      justify-content:center;gap:var(--luft)}
    .pk-bakke{display:contents}
    .pk-midt{order:1;position:relative;flex:0 0 auto;display:flex;align-items:center;justify-content:center}
    @media (min-aspect-ratio:1/1){
      .pk-scene{flex-direction:row;gap:clamp(10px,3vw,54px)}
      .pk-bakke-par{display:contents}
      .pk-bakke{display:flex;flex-direction:column;gap:calc(var(--luft) * 1.15);flex:0 0 auto}
      .pk-bakke-1{order:-1} .pk-midt{order:0} .pk-bakke-2{order:1}
    }

    /* ---------- Kassen i træ (front-set, med et lidt tykt låg) ---------- */
    .pk-kasse{position:relative;display:flex;flex-direction:column;align-items:stretch}
    .pk-laag-zone{position:relative;z-index:4}
    .pk-laag{position:relative;box-sizing:border-box;padding:calc(var(--hul) * .10);
      border-radius:20px 20px 12px 12px;transform-origin:50% 100%;
      transform:none;
      transition:transform .75s cubic-bezier(.34,1.2,.5,1);
      background:
        repeating-linear-gradient(2deg,rgba(150,95,40,.10) 0 3px,rgba(0,0,0,0) 3px 13px),
        linear-gradient(#f7dcb8,#e8c091 55%,#d5a474);
      box-shadow:
        inset 0 5px 0 rgba(255,255,255,.6),
        inset 0 -4px 0 rgba(140,90,45,.18),
        0 9px 0 #b07f4c,
        0 16px 20px rgba(90,60,25,.28);
      z-index:3;
    }
    .pk-kasse.aaben .pk-laag{transform:translateY(-100%) perspective(700px) rotateX(52deg);
      background:repeating-linear-gradient(2deg,rgba(120,70,30,.12) 0 3px,rgba(0,0,0,0) 3px 13px),linear-gradient(#c38c56,#a87140);
      box-shadow:inset 0 4px 0 rgba(255,255,255,.25),inset 0 -6px 10px rgba(80,45,15,.3),0 -4px 12px rgba(90,60,25,.2)}
    .pk-huller{transition:opacity .25s}
    .pk-kasse.aaben .pk-huller{opacity:0}
    /* Kassens indre: ses når låget er slået op */
    .pk-indre{position:absolute;inset:3px;z-index:1;border-radius:12px;overflow:hidden;box-sizing:border-box;
      border-style:solid;border-width:calc(var(--hul) * .42) calc(var(--hul) * .34) 0;
      border-color:#b47c49 #8f5c30 transparent #8f5c30;
      background:radial-gradient(90% 80% at 50% 35%,#7a4e28,#553417 80%)}
    /* skygge fra kanten øverst og lys på bunden */
    .pk-indre::before{content:"";position:absolute;left:-40%;right:-40%;top:-60%;height:60%;
      box-shadow:0 10px 18px rgba(40,20,5,.55)}
    .pk-indre::after{content:"";position:absolute;left:15%;right:15%;bottom:8%;height:30%;border-radius:50%;
      background:radial-gradient(closest-side,rgba(255,220,160,.22),rgba(255,220,160,0))}

    .pk-huller{display:grid;grid-template-columns:repeat(var(--kol,3),var(--hul));
      justify-content:center;justify-items:center;align-content:center;gap:calc(var(--hul) * .10)}
    .pk-hul{position:relative;width:var(--hul);height:var(--hul);cursor:pointer;transition:opacity .2s}
    .pk-hul svg{width:100%;height:100%;display:block;overflow:visible}
    .pk-hul-kant{fill:#8a5a2c;stroke:#8a5a2c;opacity:.5}
    .pk-hul-vaeg{fill:#7a4c22}
    .pk-hul-bund{fill:#2e1e0d}
    .pk-hul-i{opacity:0;transition:opacity .3s}
    .pk-hul.lys .pk-hul-i{opacity:.5}
    .pk-hul.hint{filter:drop-shadow(0 0 12px #fff);animation:pk-vip .8s ease-in-out 3}
    .pk-hul.hint .pk-hul-i{opacity:.95}
    .pk-hul.fyldt .pk-hul-i{opacity:1}
    .pk-hul.fejl{animation:pk-rist .4s}
    @keyframes pk-vip{0%,100%{transform:none}25%{transform:translateY(-8px) rotate(-4deg)}75%{transform:translateY(-4px) rotate(4deg)}}
    @keyframes pk-rist{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

    /* Kassen rasler, mens dyret venter på at springe op */
    .pk-kasse.rasl{animation:pk-rasl .3s ease-in-out infinite}
    @keyframes pk-rasl{0%,100%{transform:none}25%{transform:translateY(-3px) rotate(-1.2deg)}75%{transform:translateY(-1px) rotate(1.2deg)}}
    .pk-krop{position:relative;z-index:2;height:calc(var(--hul) * .72);margin-top:2px;
      border-radius:0 0 18px 18px;display:grid;place-items:center;
      background:
        repeating-linear-gradient(92deg,rgba(140,88,38,.12) 0 3px,rgba(0,0,0,0) 3px 15px),
        linear-gradient(#e9c093,#cd9760 62%,#b9824d);
      box-shadow:
        inset 0 8px 12px -6px rgba(255,255,255,.5),
        inset 0 -10px 16px -8px rgba(90,50,15,.45),
        0 11px 0 #9c6a3c,
        0 20px 24px rgba(90,60,25,.26);
    }
    .pk-krop::before,.pk-krop::after{content:"";position:absolute;top:24%;width:6%;aspect-ratio:1;border-radius:50%;
      background:
        linear-gradient(90deg,rgba(0,0,0,0) 43%,rgba(90,60,25,.6) 43% 57%,rgba(0,0,0,0) 57%),
        radial-gradient(circle at 34% 30%,#f6e2c8,#b98a55 62%,#8a5c2f);
      box-shadow:inset 0 1px 2px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.4)}
    .pk-krop::before{left:7%} .pk-krop::after{right:7%}
    /* Et håndtag i messing på forsiden (ingen form-pynt, så det ikke forveksles med klodserne) */
    .pk-maerke{position:relative;width:calc(var(--hul) * 1.05);height:calc(var(--hul) * .2);border-radius:999px;
      background:linear-gradient(#fbe3a0,#d9a441 48%,#a8741c);
      box-shadow:inset 0 2px 1px rgba(255,255,255,.6),inset 0 -2px 2px rgba(110,70,10,.35),
        0 4px 0 rgba(110,70,25,.35),0 6px 8px rgba(80,45,15,.25)}
    .pk-maerke::before,.pk-maerke::after{content:"";position:absolute;top:50%;width:calc(var(--hul) * .2);aspect-ratio:1;
      border-radius:50%;transform:translateY(-50%);
      background:radial-gradient(circle at 35% 30%,#fff2c4,#d9a441 55%,#8f5f14);
      box-shadow:0 2px 3px rgba(80,45,15,.35)}
    .pk-maerke::before{left:calc(var(--hul) * -.06)} .pk-maerke::after{right:calc(var(--hul) * -.06)}

    /* Dyret, der dukker op og ligger nede i den åbne kasse */
    .pk-spring{position:absolute;left:50%;bottom:6%;z-index:6;display:flex;flex-direction:column;align-items:center;
      opacity:0;pointer-events:none;transform:translate(-50%,34%) scale(.2);transform-origin:50% 100%;
      transition:transform .6s cubic-bezier(.3,1.6,.5,1),opacity .2s}
    .pk-spring.oppe{opacity:1;pointer-events:auto;transform:translate(-50%,0) scale(1)}
    .pk-figur{font-size:calc(var(--hul) * .85);line-height:1;filter:drop-shadow(0 6px 6px rgba(90,60,25,.32));
      animation:pk-figur-hop 1.9s ease-in-out infinite}
    .pk-spring.hop .pk-figur{animation:pk-luft .7s cubic-bezier(.3,1.5,.5,1)}
    @keyframes pk-figur-hop{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
    @keyframes pk-luft{0%{transform:translateY(0) scale(1)}35%{transform:translateY(-38%) scale(1.12)}
      70%{transform:translateY(0) scale(.96)}100%{transform:translateY(0) scale(1)}}

    /* ---------- Klodserne ---------- */
    .pk-klods{position:relative;z-index:5;width:var(--klods);height:var(--klods);padding:0;border:0;
      background:transparent;touch-action:none;cursor:grab;
      filter:drop-shadow(0 6px 5px rgba(90,60,25,.28))}
    .pk-klods svg{width:100%;height:100%;display:block;overflow:visible}
    .pk-klods.loftet{z-index:40;cursor:grabbing;animation:none;
      filter:drop-shadow(0 16px 14px rgba(90,60,25,.34)) drop-shadow(0 0 16px rgba(255,255,255,.95))}
    /* Den valgte klods løfter sig tydeligt, så barnet kan se hvilken den har taget */
    .pk-klods.valgt,.pk-klods.ny.valgt{animation:none;transform:translateY(-10%) scale(1.12);transition:transform .25s cubic-bezier(.3,1.6,.5,1);
      filter:drop-shadow(0 18px 10px rgba(90,60,25,.32)) drop-shadow(0 0 10px #fff) drop-shadow(0 0 4px #fff)}
    .pk-klods.ny{animation:pk-vaelt .85s cubic-bezier(.3,1.4,.5,1) both}
    @keyframes pk-vaelt{0%{transform:translateY(-46px) rotate(-26deg) scale(.82);opacity:0}
      58%{transform:translateY(7px) rotate(7deg) scale(1.03);opacity:1}
      78%{transform:translateY(-5px) rotate(-3deg) scale(1)}
      100%{transform:none;opacity:1}}
    .pk-plads{visibility:hidden;flex:0 0 auto}

    @media (prefers-reduced-motion:reduce){
      .pk-laag,.pk-spring,.pk-hul-i,.pk-hul{transition:none}
      .pk-hul.hint,.pk-hul.fejl,.pk-klods.ny,.pk-figur,.pk-spring.hop .pk-figur,.pk-kasse.rasl{animation:none}
    }
  `);

  let root, alive, timers, pk, huller, klodser, valgt, drag, fuld, runde, naesteTimer, sidstFejl, figur, planNr;
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; };
  const q = s => root.querySelector(s);
  const alle = s => [...root.querySelectorAll(s)];

  /* ---------- Lyd (små byggeklodser oven på Web Audio) ---------- */
  function tone(type, pts, t0, dur, peak = .3, lp = 0, vib = null) {
    const a = Spil.audio(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(pts[0][1], t);
    pts.slice(1).forEach(([f, hz]) => o.frequency.exponentialRampToValueAtTime(hz, t + f * dur));
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.06, dur * .25));
    g.gain.setValueAtTime(peak, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let n = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); n = f; }
    if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1];
      l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    n.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t0, dur, freq, peak = .3, qv = 1, to = 0) {
    const a = Spil.audio(), t = a.currentTime + t0, len = Math.ceil(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = "bandpass"; f.Q.value = qv; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .03);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur);
  }
  const LYD = {
    // "klonk": klodsen lander nede i kassen
    klonk() { tone("sine", [[0, 260], [.28, 105], [1, 62]], 0, .34, .45, 0, [11, 26]);
      noise(0, .1, 210, .26, 1.3, 80); tone("triangle", [[0, 780], [1, 320]], .02, .09, .12); },
    // "sug": klodsen suges ind i hullet
    sug() { noise(0, .26, 700, .15, 1.7, 2600); tone("sine", [[0, 320], [.6, 780], [1, 520]], 0, .26, .13); },
    // "boing": dyret, der dukker op af kassen
    fjeder() { tone("sine", [[0, 140], [.3, 520], [.7, 290], [1, 470]], 0, .9, .3, 0, [13, 55]);
      tone("triangle", [[0, 280], [1, 880]], .04, .5, .09, 0, [19, 42]); },
    hop() { tone("sine", [[0, 560], [1, 190]], 0, .2, .22); noise(.02, .1, 500, .1, 1.6, 200); },
    fejl() { tone("triangle", [[0, 300], [1, 190]], 0, .26, .17); }
  };
  const lyd = k => { try { LYD[k](); } catch (e) {} };

  /* ---------- Markup ---------- */
  // Kanten er en jævn streg rundt om hullet, og indeni ses lidt af kassens indervæg øverst, så hullet ser dybt ud
  const svgHul = f => `<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><clipPath id="pkc-${f}"><path d="${P[f]}"/></clipPath></defs>
      <path class="pk-hul-kant" d="${P[f]}" stroke-width="11" stroke-linejoin="round"/>
      <g clip-path="url(#pkc-${f})">
        <rect class="pk-hul-vaeg" x="0" y="0" width="100" height="100"/>
        <path class="pk-hul-bund" d="${P[f]}" transform="translate(0 7)"/>
      </g>
      <path class="pk-hul-i" d="${P[f]}" fill="${INFO[f].farve}"/>
    </svg>`;
  const svgKlods = f => `<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="pkg-${f}" x1=".25" y1="0" x2=".75" y2="1">
        <stop offset="0" stop-color="${INFO[f].lys}"/><stop offset=".62" stop-color="${INFO[f].farve}"/>
        <stop offset="1" stop-color="${INFO[f].farve}"/>
      </linearGradient></defs>
      <path d="${P[f]}" fill="url(#pkg-${f})" stroke="${INFO[f].moerk}" stroke-width="7"
        stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${P[f]}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"
        stroke-linejoin="round" transform="translate(50 50) scale(.82) translate(-50 -50)"/>
    </svg>`;

  /* ---------- Hjælpere ---------- */
  const rectI = el => el.getBoundingClientRect();
  function rydValg() {
    valgt = null;
    alle(".pk-klods").forEach(e => e.classList.remove("valgt"));
    alle(".pk-hul").forEach(e => e.classList.remove("lys", "hint"));
  }
  function visVej(form) { // det rigtige hul lyser svagt, så barnet kan se hvor klodsen hører til
    const h = huller.find(x => x.form === form && !x.fyldt);
    if (h) h.el.classList.add("lys");
  }
  function vip(form) { // kraftigere vink: hullet vippet og lyser op
    const h = huller.find(x => x.form === form && !x.fyldt);
    if (!h) return;
    h.el.classList.remove("hint"); void h.el.offsetWidth; h.el.classList.add("hint");
    later(() => h.el && h.el.classList.remove("hint"), 2600);
  }

  /* Klodsen løftes ud af bakken og bliver absolut placeret, så den kan følge fingeren uden forsinkelse.
     Der lægges en usynlig plads i bakken, så de andre klodser ikke rykker. */
  function frigør(k) {
    if (k.fri) { // afbryd en igangværende tilbage-glidning, så klodsen følger fingeren med det samme
      if (k.tilbageT) { clearTimeout(k.tilbageT); k.tilbageT = null; }
      k.el.style.transition = "none";
      return;
    }
    k.el.classList.remove("ny"); // indgangs-animationen må ikke styre transformen
    k.el.classList.add("loftet");
    const r = rectI(k.el), o = rectI(pk);
    k.w = r.width; k.h = r.height;
    const p = document.createElement("div");
    p.className = "pk-plads";
    p.style.width = r.width + "px"; p.style.height = r.height + "px";
    k.el.parentNode.insertBefore(p, k.el);
    k.plads = p;
    const s = k.el.style;
    s.position = "absolute"; s.left = "0px"; s.top = "0px";
    s.width = r.width + "px"; s.height = r.height + "px";
    s.transition = "none";
    k.ox = o.left; k.oy = o.top;
    k.x = r.left - o.left; k.y = r.top - o.top;
    s.transform = `translate(${k.x}px,${k.y}px)`;
    k.fri = true;
  }
  function tilbage(k) { // glider blidt tilbage til sin plads i bakken
    if (!k.fri || !k.el.isConnected) return;
    const r = rectI(k.plads), o = rectI(pk), s = k.el.style;
    k.el.classList.remove("loftet");
    s.transition = "transform .5s cubic-bezier(.3,1.3,.5,1)";
    s.transform = `translate(${r.left - o.left}px,${r.top - o.top}px)`;
    k.tilbageT = later(() => {
      k.tilbageT = null;
      if (!k.el.isConnected) return;
      k.el.style.cssText = "";
      k.fri = false;
      if (k.plads) { k.plads.remove(); k.plads = null; }
    }, 520);
  }

  function afslutPut(k, hul) {
    if (!alive) return;
    k.el.remove();
    if (k.plads) { k.plads.remove(); k.plads = null; }
    hul.fyldt = true;
    hul.el.classList.remove("lys", "hint");
    hul.el.classList.add("fyldt");
    klodser = klodser.filter(x => x !== k);
    lyd("klonk");
    Spil.burstAt(hul.el, "⭐✨");
    try { Spil.tone([784, 1046], .09, "sine"); } catch (e) {}
    Spil.say(INFO[k.form].navn + "!", null, INFO[k.form].lyd);
    if (!huller.some(h => !h.fyldt)) kassenFuld();
  }

  // Klodsen flyver hen til hullet og synker ned i kassen
  function putIBoks(k, hul, lang) {
    if (!alive || hul.fyldt) return;
    frigør(k);
    k.el.classList.remove("loftet", "valgt");
    const r = rectI(hul.el), o = rectI(pk);
    const tx = r.left + r.width / 2 - o.left - k.w / 2;
    const ty = r.top + r.height / 2 - o.top - k.h / 2;
    const tid = lang ? .52 : .34;
    lyd("sug");
    k.el.style.transition = `transform ${tid}s cubic-bezier(.35,.95,.45,1),opacity ${tid}s ease-in .12s`;
    k.el.style.transform = `translate(${tx}px,${ty}px) scale(.18)`;
    k.el.style.opacity = "0";
    later(() => afslutPut(k, hul), tid * 1000 + 90);
  }

  function forkert(k, hul) {
    if (hul) { hul.el.classList.remove("fejl"); void hul.el.offsetWidth; hul.el.classList.add("fejl"); }
    tilbage(k);
    lyd("fejl");
    const nu = Date.now();
    if (nu - sidstFejl > 1000) {
      sidstFejl = nu;
      Spil.say("Den passer ikke. Prøv et andet hul!", null, "putte-passer-ikke");
    }
    vip(k.form);
    visVej(k.form);
  }

  /* ---------- Træk med fingeren ---------- */
  function startTraek(k, e) {
    if (!alive || fuld || drag) return;
    if (e.button !== undefined && e.button > 0 && e.pointerType === "mouse") return;
    rydValg();
    drag = { k, id: e.pointerId, x0: e.clientX, y0: e.clientY, flyttet: false };
    const r = rectI(k.el);
    drag.gx = e.clientX - r.left; drag.gy = e.clientY - r.top;
    frigør(k);
    drag.ox = k.ox; drag.oy = k.oy;
    try { k.el.setPointerCapture(e.pointerId); } catch (err) {}
    visVej(k.form);
    try { e.preventDefault(); } catch (err) {}
  }

  function flyt(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.flyttet && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) drag.flyttet = true;
    const k = drag.k;
    if (!drag.flyttet) return;
    k.x = e.clientX - drag.gx - drag.ox;
    k.y = e.clientY - drag.gy - drag.oy;
    k.el.style.transform = `translate(${k.x}px,${k.y}px) scale(1.08)`;
    try { e.preventDefault(); } catch (err) {}
  }

  function slip(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    const k = d.k;
    try { k.el.releasePointerCapture(e.pointerId); } catch (err) {}
    if (!k.el.isConnected) return;
    alle(".pk-hul").forEach(h => h.classList.remove("lys"));
    if (!d.flyttet) { tilbage(k); vaelg(k); return; } // et tryk: klodsen løftes bare og vælges
    const br = rectI(k.el);
    const bx = br.left + br.width / 2, by = br.top + br.height / 2;
    const ret = huller.find(h => h.form === k.form && !h.fyldt);
    let afstand = Infinity, bedste = null;
    huller.forEach(h => {
      if (h.fyldt) return;
      const r = rectI(h.el);
      const af = Math.hypot(bx - (r.left + r.width / 2), by - (r.top + r.height / 2));
      if (af < afstand) { afstand = af; bedste = h; }
    });
    // Gavmild radius: man må slippe et godt stykke fra hullet
    const graense = ret ? Math.max(rectI(ret.el).width, rectI(ret.el).height) * .82 : 80;
    if (ret) {
      const r = rectI(ret.el);
      if (Math.hypot(bx - (r.left + r.width / 2), by - (r.top + r.height / 2)) <= graense) {
        putIBoks(k, ret, false);
        return;
      }
    }
    forkert(k, bedste && afstand <= graense ? bedste : null);
  }

  function afbryd(e) {
    if (drag && drag.id === e.pointerId) {
      const d = drag; drag = null;
      alle(".pk-hul").forEach(h => h.classList.remove("lys"));
      tilbage(d.k);
    }
  }

  function vaelg(k) {
    if (!alive || fuld || !k.el.isConnected) return;
    if (valgt === k) { sig(k); vip(k.form); return; }
    rydValg();
    valgt = k;
    k.el.classList.add("valgt");
    sig(k);
    vip(k.form);
  }
  const sig = k => Spil.say(INFO[k.form].navn + "!", null, INFO[k.form].lyd);

  function trykHul(h) {
    if (!alive || fuld || h.fyldt) return;
    if (!valgt) { Spil.say("Tag en klods først.", null, "putte-vaelg"); return; }
    const k = valgt;
    if (k.form === h.form) { rydValg(); putIBoks(k, h, true); }
    else forkert(k, h);
  }

  // Vent til stemmen er færdig (højst ca. 2 sek.), så en replik ikke klippes af den næste
  function naarStille(fn, n = 0) {
    if (Spil.isTalking() && n < 14) later(() => naarStille(fn, n + 1), 150);
    else fn();
  }
  // Ny runde om ms millisekunder, men først når dyret er færdigt med at tale (højst 6 sek. ekstra)
  function planNyRunde(ms) {
    if (naesteTimer) clearTimeout(naesteTimer);
    const nr = ++planNr;
    const tjek = (n = 0) => {
      if (nr !== planNr) return;
      if (Spil.isTalking() && n < 40) { naesteTimer = later(() => tjek(n + 1), 150); return; }
      nyRunde();
    };
    naesteTimer = later(tjek, ms);
  }

  /* ---------- Runder ---------- */
  function byggKlodser(former) {
    const b1 = q(".pk-bakke-1"), b2 = q(".pk-bakke-2");
    b1.innerHTML = ""; b2.innerHTML = ""; q(".pk-huller").innerHTML = "";
    huller = []; klodser = [];
    // hullerne i låget i en ny rækkefølge (4 huller står 2x2, 5-6 huller står 3+2 / 3+3)
    const hulRække = Spil.shuffle(former.slice());
    q(".pk-huller").style.setProperty("--kol", former.length === 4 ? 2 : Math.min(3, former.length));
    hulRække.forEach((f, i) => {
      const h = document.createElement("div");
      h.className = "pk-hul"; h.dataset.form = f;
      h.setAttribute("role", "button");
      h.setAttribute("aria-label", "Hul til " + INFO[f].navn.toLowerCase());
      h.innerHTML = svgHul(f);
      h.onpointerdown = e => { try { e.preventDefault(); } catch (err) {} const hh = huller.find(x => x.el === h); if (hh) trykHul(hh); };
      q(".pk-huller").appendChild(h);
      huller.push({ form: f, el: h, fyldt: false });
    });
    // klodserne i bakkerne (skiftevis i hver sin bakke, så de ligger pænt fordelt)
    const kRække = Spil.shuffle(former.slice());
    kRække.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pk-klods ny";
      b.dataset.form = f;
      b.setAttribute("aria-label", INFO[f].navn);
      b.innerHTML = svgKlods(f);
      b.style.animationDelay = (i * .12) + "s";
      const k = { form: f, el: b, fri: false, plads: null, tilbageT: null };
      b.addEventListener("pointerdown", e => startTraek(k, e));
      b.addEventListener("contextmenu", e => e.preventDefault());
      (i % 2 === 0 ? b1 : b2).appendChild(b);
      klodser.push(k);
    });
  }

  function nyRunde(forste) {
    if (!alive) return;
    naesteTimer = null;
    fuld = false; drag = null;
    rydValg();
    if (!forste) runde++;
    const antal = Math.min(3 + runde, 6);
    const voksede = !forste && antal > Math.min(3 + runde - 1, 6);
    // luk låget, og gem dyret igen
    q(".pk-kasse").classList.remove("aaben");
    q(".pk-spring").classList.remove("oppe", "hop");
    q(".pk-kasse").classList.remove("rasl");
    byggKlodser(ORDEN.slice(0, antal));
    if (forste) Spil.say("Hej! Kan du putte klodserne i kassen? Træk en klods hen til et hul.", null, "putte-hej");
    else if (voksede) Spil.say("Nu er der flere huller!", null, ["putte-flere", "putte-klods"]);
    else Spil.say("Se, nu vælter klodserne ud igen!", null, "putte-igen");
  }

  // Dyrenes navn med "en/et" (til "Det er en ko." — lydfilerne er-<dyr> findes fra Find dyret)
  const UBEST = { ko: "en ko", kat: "en kat", hund: "en hund", gris: "en gris", and: "en and", faar: "et får",
    hest: "en hest", loeve: "en løve", froe: "en frø", ugle: "en ugle", hoene: "en høne", mus: "en mus",
    elefant: "en elefant", abe: "en abe", fisk: "en fisk", bi: "en bi", bjoern: "en bjørn", slange: "en slange" };

  // Kassen er fuld: først spænding ("Hvem gemmer sig i kassen?", mens kassen rasler),
  // så springer låget op, dyret kommer frem, og stemmen siger, hvem det er.
  function kassenFuld() {
    if (!alive || fuld) return;
    fuld = true; rydValg();
    later(() => naarStille(() => { // lad formens navn ("Trekanten!") tale færdig først
      if (!alive) return;
      const d = Spil.shuffle(DYR.slice())[0];
      figur = d;
      Spil.preload(["er-" + d[1], ...Spil.jaDyr(d[1])]);
      q(".pk-figur").textContent = d[0];
      const kasse = q(".pk-kasse");
      let ude = false;
      const bank = () => { // små bank indefra, så længe dyret venter
        if (ude || !alive) return;
        tone("sine", [[0, 190], [1, 85]], 0, .09, .3); noise(0, .05, 300, .12);
        later(bank, 330 + Math.random() * 160);
      };
      const spring = () => {
        if (ude || !alive) return;
        ude = true;
        kasse.classList.remove("rasl");
        kasse.classList.add("aaben");
          later(() => {
          q(".pk-spring").classList.add("oppe");
          lyd("fjeder");
          konfetti(3);
          later(() => Spil.say(`Det er ${UBEST[d[1]] || d[1]}!`, null, "er-" + d[1]), 350);
          planNyRunde(7000);
        }, 460);
      };
      kasse.classList.add("rasl");
      bank();
      Spil.say("Kassen er fuld! Hurra! Hvem gemmer sig i kassen?", () => later(spring, 250), ["putte-fuld", "putte-hvem"]);
      later(spring, 5500); // reserve, hvis stemmen bliver afbrudt
    }), 400);
  }

  // Kun til dybe links: kassen står straks åben med dyret fremme
  function visDyr(d) {
    fuld = true; figur = d;
    Spil.stopTalking();
    q(".pk-figur").textContent = d[0];
    q(".pk-kasse").classList.add("aaben");
    q(".pk-spring").classList.add("oppe");
  }

  function konfetti(antal = 1) {
    if (!alive) return;
    for (let i = 0; i < antal; i++)
      later(() => Spil.burst(innerWidth * (.1 + Math.random() * .8), innerHeight * (.12 + Math.random() * .42),
        "🎉⭐✨💫🎊"), i * 260);
  }

  function trykFigur() {
    if (!alive || !fuld || !figur) return;
    const s = q(".pk-spring");
    s.classList.remove("hop"); void s.offsetWidth; s.classList.add("hop");
    lyd("hop");
    Spil.burstAt(s, "🎉⭐✨💫");
    Spil.say(figur[2], null, Spil.jaDyr(figur[1]));
    planNyRunde(4500); // lidt tid til at høre dyret, så videre
  }

  Spil.register({
    id: "puttekassen", navn: "Puttekassen", ikon: "📦", farve: "#ffe9a8",
    start(r) {
      Spil.preload(["putte-hej", "putte-klods", "putte-passer-ikke", "putte-vaelg", "putte-fuld",
        "putte-hvem", "putte-flere", "putte-igen", ...ORDEN.map(f => INFO[f].lyd)]);
      root = r; alive = true; timers = []; huller = []; klodser = [];
      valgt = null; drag = null; fuld = false; runde = 0; naesteTimer = null; sidstFejl = 0; figur = null; planNr = 0;

      root.innerHTML = `<div class="pk">
        <button class="pk-sig" aria-label="Hør det igen">🔊</button>
        <div class="pk-scene">
          <div class="pk-midt">
            <div class="pk-kasse">
              <div class="pk-laag-zone">
                <div class="pk-indre"></div>
                <div class="pk-laag"><div class="pk-huller"></div></div>
                <div class="pk-spring"><div class="pk-figur">🐄</div></div>
              </div>
              <div class="pk-krop"><div class="pk-maerke"></div></div>
            </div>
          </div>
          <div class="pk-bakke-par">
            <div class="pk-bakke pk-bakke-1"></div>
            <div class="pk-bakke pk-bakke-2"></div>
          </div>
        </div>
      </div>`;
      pk = q(".pk");
      q(".pk-sig").onclick = () => {
        if (valgt) sig(valgt);
        else Spil.say("Træk klodsen hen til hullet.", null, "putte-klods");
      };
      q(".pk-spring").addEventListener("pointerdown", e => { e.preventDefault(); trykFigur(); });
      addEventListener("pointermove", flyt);
      addEventListener("pointerup", slip);
      addEventListener("pointercancel", afbryd);
      // Dybe links til test: runde-1..runde-4 (3-6 former), valgt, fuld, dyr eller dyr-<navn> (fx dyr-ko)
      const dyb = (Spil.dyb || "").toLowerCase();
      const m = dyb.match(/^runde-(\d)$/);
      if (m) runde = Math.max(0, Math.min(3, +m[1] - 1));
      nyRunde(true);
      if (dyb === "valgt") vaelg(klodser[0]);
      if (dyb === "fuld" || dyb.startsWith("dyr")) {
        klodser.forEach(k => { const h = huller.find(x => x.form === k.form); k.el.remove(); h.fyldt = true; h.el.classList.add("fyldt"); });
        klodser = [];
        if (dyb === "fuld") kassenFuld();
        else visDyr(DYR.find(d => d[1] === dyb.slice(4)) || DYR[0]);
      }
    },
    stop() {
      alive = false; planNr++;
      timers.forEach(clearTimeout); timers = [];
      if (naesteTimer) clearTimeout(naesteTimer);
      drag = null; valgt = null;
      removeEventListener("pointermove", flyt);
      removeEventListener("pointerup", slip);
      removeEventListener("pointercancel", afbryd);
    }
  });
})();
