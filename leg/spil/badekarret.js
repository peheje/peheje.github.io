// Spil: Badekarret — en gul gummiand svømmer i et badekar fuld af skum.
// Sæbebobler med tal stiger langsomt op af vandet, og stemmen beder om et tal.
// Rigtig boble: plop, konfetti og anden hopper. Forkert boble: blid lyd, og stemmen siger tallet.
// Hver 5. rigtige sprøjter anden vand, og der kommer ællinger. Ingen tabe-tilstand.
(function () {
  // "én" ... "ti" (replikkerne bad-pop-1 ... 10 og bad-er-1 ... 10)
  const ORD = ["én", "to", "tre", "fire", "fem", "seks", "syv", "otte", "ni", "ti"];
  const ROS = ["Super!", "Flot klaret!", "Sejt!", "Du er god til det!", "Wow!"];
  // Hvor boblerne svæver (x, y som andel af scenen). Der er plads til store bobler uden overlap.
  const PLADSER = {
    3: [[.20, .32], [.52, .13], [.82, .36]],
    4: [[.17, .30], [.44, .13], [.72, .27], [.84, .53]],
    5: [[.16, .32], [.44, .12], [.72, .26], [.26, .56], [.62, .52]],
  };

  Spil.css("css-badekarret", `
    .bk{position:relative;height:100%;box-sizing:border-box;display:flex;flex-direction:column;
      padding-block:2vh 0;
      padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
      /* Badeværelsesfliser: lyseblå fliser med lyse fuger og et blødt lys ovenfra */
      background-color:#e9f6fb;
      background-image:
        linear-gradient(90deg,rgba(150,200,225,.55) 0 3px,transparent 3px),
        linear-gradient(180deg,rgba(150,200,225,.55) 0 3px,transparent 3px),
        radial-gradient(130% 70% at 50% -10%,#fff 0 35%,rgba(255,255,255,0) 72%),
        linear-gradient(180deg,#eef9ff,#dbedf7);
      background-size:
        clamp(70px,10vh,120px) clamp(70px,10vh,120px),
        clamp(70px,10vh,120px) clamp(70px,10vh,120px),
        100% 100%,100% 100%;
    }
    .bk-top{display:flex;justify-content:center;align-items:center;min-height:clamp(30px,5.4vh,52px);position:relative;z-index:6}
    .bk-stjerner{display:flex;gap:clamp(4px,1vw,12px);font-size:clamp(20px,3.6vh,34px);line-height:1}
    /* Stjernerne er tegnet med SVG: tomme er hvide med blå kant, fyldte er gyldne */
    .bk-stjerner svg{width:clamp(24px,min(4.4vh,7.4vw),42px);height:auto;overflow:visible;transition:transform .25s}
    .bk-stjerner path{fill:rgba(255,255,255,.85);stroke:#9cc9e2;stroke-width:2.2;stroke-linejoin:round}
    .bk-stjerner .on{transform:scale(1.15)}
    .bk-stjerner .on path{fill:#ffc93c;stroke:#e09a00;filter:drop-shadow(0 2px 0 rgba(176,110,0,.35))}
    .bk-sig{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(52px,8.5vh,78px);aspect-ratio:1;border-radius:50%;background:var(--sun);box-shadow:0 6px 0 #d9a21a;
      font-size:clamp(24px,4vh,38px);z-index:7}
    .bk-sig:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}

    /* Scenen: badekarret står nederst, boblerne svæver over vandet */
    .bk-scene{position:relative;flex:1;min-height:0}
    .bk-kar{position:absolute;left:2.5%;right:2.5%;bottom:clamp(14px,3.4vh,30px);height:38%}
    @media (min-aspect-ratio:1/1){.bk-kar{height:51%}}
    /* Små løvefødder under karret og en blank vandhane på kanten, så det ligner et rigtigt badekar */
    .bk-fod{position:absolute;top:94%;width:clamp(26px,5.5%,60px);height:clamp(18px,3.8vh,36px);
      border-radius:30% 30% 50% 50%/25% 25% 75% 75%;
      background:radial-gradient(circle at 36% 30%,#fff 0 12%,#dfe7ee 40%,#a9b8c6 100%);
      box-shadow:inset -3px -4px 6px rgba(31,58,95,.2),0 4px 6px rgba(31,58,95,.16)}
    .bk-fod.v{left:9%;transform:rotate(8deg)}
    .bk-fod.h{right:9%;transform:rotate(-8deg)}
    .bk-hane{position:absolute;right:.5%;bottom:calc(100% - 5%);width:clamp(54px,min(12vh,16vw),104px);z-index:4;pointer-events:none;
      filter:drop-shadow(0 4px 4px rgba(31,58,95,.2))}
    .bk-krop{position:absolute;inset:0;border-radius:22% 22% 30% 30%/14% 14% 22% 22%;
      background:linear-gradient(180deg,#fff 0 34%,#f5fafd 62%,#d8e7f0 100%);
      box-shadow:inset 0 -22px 30px rgba(31,58,95,.14),inset 18px 0 26px -18px rgba(31,58,95,.12),
        inset -18px 0 26px -18px rgba(31,58,95,.12),0 14px 26px rgba(31,58,95,.16)}
    /* Vandet har en hvid porcelænskant, så det ser ud som om det ligger inde i karet */
    .bk-vand{position:absolute;left:5%;right:5%;top:9%;bottom:10%;overflow:hidden;
      border:clamp(7px,1.5vh,15px) solid #fff;
      border-radius:48% 48% 40% 40%/17% 17% 26% 26%;
      background:linear-gradient(180deg,#d9f4ff 0 2%,#a9e5fc 8%,#6cc2ec 40%,#3f9fd6 100%);
      box-shadow:inset 0 12px 22px rgba(18,78,118,.26),inset 0 -18px 26px rgba(20,80,120,.35),
        0 7px 16px -3px rgba(31,58,95,.22)}
    /* Bølger: bløde kammemønstre, der skubber lidt til hinanden */
    .bk-boelge{position:absolute;left:-6%;width:112%;top:10%;height:clamp(20px,3.8vh,38px);
      animation:bk-boelge 5.5s ease-in-out infinite alternate}
    .bk-boelge.b2{animation-delay:-2.7s;animation-duration:7s;top:17%}
    @keyframes bk-boelge{from{transform:translateX(-14px)}to{transform:translateX(14px)}}
    /* Skum: en bred stribe af hvide bobler langs vandoverfladen (fyldes med JS) */
    .bk-skum{position:absolute;left:0;right:0;top:0;height:14%;z-index:2;pointer-events:none}
    .bk-skum span{position:absolute;border-radius:50%;
      background:radial-gradient(circle at 34% 26%,#fff 0 45%,#f6fcff 70%,#dceff9 100%);
      box-shadow:inset 0 -3px 6px rgba(90,150,185,.10),0 2px 5px rgba(31,58,95,.10);
      animation:bk-skumboel 6s ease-in-out infinite alternate}
    .bk-skum span.bag{background:radial-gradient(circle at 34% 26%,#f2fbff 0 50%,#e4f4fc 75%,#cfe8f5 100%)}
    @keyframes bk-skumboel{from{transform:translateY(0)}to{transform:translateY(-3px)}}
    /* En sæbe på kanten */
    .bk-saebe{position:absolute;left:7%;top:2.5%;width:9%;height:7%;min-width:32px;min-height:15px;
      border-radius:40% 44% 40% 44%/50%;z-index:5;transform:rotate(-7deg);
      background:linear-gradient(150deg,#ffd3e6,#ff9ec4 60%,#f2749f);
      box-shadow:inset 0 3px 0 rgba(255,255,255,.75),0 4px 8px rgba(31,58,95,.18)}
    .bk-saebe::after{content:"";position:absolute;left:18%;top:24%;width:34%;height:22%;border-radius:50%;
      background:rgba(255,255,255,.8)}
    /* Et par små luftbobler som pynt i luften */
    .bk-prik{position:absolute;border-radius:50%;z-index:4;pointer-events:none;
      background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.95) 0 12%,rgba(255,255,255,.28) 13% 24%,
        rgba(164,220,246,.32) 60%,rgba(120,190,230,.45));
      border:1px solid rgba(255,255,255,.85);box-shadow:inset -2px -3px 6px rgba(70,160,215,.28);
      animation:bk-prik 7s ease-in-out infinite alternate}
    @keyframes bk-prik{from{transform:translateY(0)}to{transform:translateY(-26px)}}

    /* Gummianden (tegnet med CSS, så den er gul og blød) */
    .bk-dukke{position:absolute;left:13%;bottom:16%;width:clamp(68px,min(18vh,26vw),158px);aspect-ratio:1.15/1;z-index:3}
    .bk-dukke .dk{position:absolute;inset:0;transform-origin:50% 78%;animation:bk-svom 5s ease-in-out infinite}
    .bk-dukke.hop .dk{animation:bk-hop .8s cubic-bezier(.3,1.5,.5,1)}
    .bk-dukke .hale{position:absolute;left:0;bottom:24%;width:26%;height:28%;
      border-radius:60% 20% 40% 50%/60% 30% 50% 60%;transform:rotate(-18deg);
      background:linear-gradient(140deg,#ffe066,#f1b900)}
    .bk-dukke .krop{position:absolute;left:6%;right:0;bottom:0;height:60%;
      border-radius:52% 52% 44% 44%/62% 62% 38% 38%;
      background:radial-gradient(circle at 34% 22%,#fff8cc 0 7%,#ffdf5e 30%,#ffc61a 70%,#eda900 100%);
      box-shadow:inset -4px -8px 12px rgba(185,115,0,.26)}
    .bk-dukke .hoved{position:absolute;left:44%;top:2%;width:50%;aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 32% 26%,#fff8cc 0 8%,#ffdf5e 34%,#ffc61a 72%,#eda900 100%);
      box-shadow:inset -3px -5px 10px rgba(185,115,0,.22)}
    .bk-dukke .hoved::before{content:"";position:absolute;left:6%;top:-18%;width:46%;height:34%;border-radius:50%;
      background:radial-gradient(circle at 36% 30%,#fff,#e8f7ff);box-shadow:0 2px 5px rgba(31,58,95,.12)}
    .bk-dukke .hoved::after{content:"";position:absolute;left:38%;top:-26%;width:34%;height:27%;border-radius:50%;
      background:radial-gradient(circle at 36% 30%,#fff,#f0fbff);box-shadow:0 2px 5px rgba(31,58,95,.10)}
    .bk-dukke .naeb{position:absolute;left:84%;top:33%;width:28%;height:17%;
      border-radius:44% 56% 56% 44%/60% 60% 40% 40%;
      background:linear-gradient(180deg,#ffb340,#f08a00);box-shadow:inset 0 -3px 0 rgba(150,70,0,.2)}
    .bk-dukke .oje{position:absolute;left:65%;top:24%;width:10%;aspect-ratio:1;border-radius:50%;
      background:#3a2a10;box-shadow:inset 1px 1px 0 #fff}
    .bk-dukke .vinge{position:absolute;left:17%;top:49%;width:44%;height:30%;
      border-radius:50% 60% 40% 50%/60% 50% 50% 40%;transform:rotate(-8deg);
      background:linear-gradient(140deg,#ffe680,#f0b800);box-shadow:inset -2px -3px 7px rgba(165,95,0,.34),
        0 1px 0 rgba(255,255,255,.6)}
    /* Vandlinje: den nederste del af anden er under vand, og der er en lille ring af bølger om den */
    .bk-dukke .dk{z-index:1}
    .bk-dukke::before{content:"";position:absolute;left:-4%;right:-10%;bottom:-9%;height:24%;border-radius:50%;
      background:radial-gradient(closest-side,rgba(20,90,150,.28),rgba(20,90,150,0));z-index:0}
    .bk-dukke::after{content:"";position:absolute;left:1%;right:-7%;bottom:-5%;height:25%;border-radius:50%;z-index:2;
      background:linear-gradient(180deg,rgba(232,248,255,.95) 0 6%,rgba(130,206,240,.94) 20%,rgba(88,178,228,.95) 60%,rgba(74,164,220,.9));
      box-shadow:0 0 0 4px rgba(255,255,255,.28),0 0 0 11px rgba(255,255,255,.12);animation:bk-ring 5s ease-in-out infinite}
    @keyframes bk-ring{0%,100%{transform:translateX(-5%) scaleX(1)}50%{transform:translateX(5%) scaleX(1.04)}}
    @keyframes bk-svom{0%,100%{transform:translateX(-5%) rotate(-2deg)}50%{transform:translateX(5%) rotate(2deg)}}
    @keyframes bk-hop{0%{transform:translateY(0) rotate(0)}
      30%{transform:translateY(-34%) rotate(-8deg) scale(1.06)}
      62%{transform:translateY(0) rotate(4deg) scale(.98)}
      82%{transform:translateY(-9%) rotate(-2deg)}
      100%{transform:translateY(0) rotate(0)}}

    /* Ællinger, der kommer frem til festen */
    .bk-aelinger{position:absolute;inset:0;z-index:3;pointer-events:none}
    .bk-dukke.lille{width:clamp(34px,min(8vh,12vw),74px);opacity:0;transform:translateY(24px) scale(.6);
      transition:opacity .4s,transform .5s cubic-bezier(.3,1.5,.5,1)}
    .bk-dukke.lille.vis{opacity:1;transform:translateY(0) scale(1)}
    .bk-dukke.lille .dk{animation-duration:4.2s;animation-delay:var(--sd,0s)}

    /* Sæbeboblerne med tal */
    .bk-bobler{position:absolute;inset:0;z-index:5;pointer-events:none}
    .bk-boble{position:absolute;transform:translate(-50%,-50%);pointer-events:none}
    .bk-b{pointer-events:auto;position:relative;width:clamp(80px,min(16vh,26vw),140px);aspect-ratio:1;
      border-radius:50%;display:grid;place-items:center;font-weight:800;
      /* Tallet fylder godt halvdelen af boblen, så det kan ses på afstand */
      font-size:clamp(50px,min(11vh,20vw),96px);line-height:1;letter-spacing:-.04em;color:#0c3f61;
      text-shadow:0 2px 0 rgba(255,255,255,.95),0 0 10px rgba(255,255,255,.85);
      border:3px solid rgba(255,255,255,.9);
      background:
        radial-gradient(circle at 31% 26%,rgba(255,255,255,.95) 0 7%,rgba(255,255,255,.4) 8% 19%,transparent 20%),
        radial-gradient(circle at 71% 79%,rgba(255,255,255,.4) 0 7%,transparent 8%),
        radial-gradient(circle at 50% 46%,rgba(186,238,255,.42) 0 52%,rgba(108,196,236,.62) 100%);
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.5),inset -10px -14px 22px rgba(70,160,215,.34),
        inset 10px 12px 22px rgba(255,255,255,.7),0 8px 18px rgba(31,58,95,.18);
      animation:bk-frem .55s cubic-bezier(.2,1.5,.5,1) var(--fd,0s) both,
        bk-bob var(--bobt,3.6s) ease-in-out var(--bd,.6s) infinite}
    @keyframes bk-frem{from{transform:translateY(140px) scale(.25);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    @keyframes bk-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
    .bk-b.popper{animation:bk-pop .5s ease-out forwards!important;pointer-events:none}
    @keyframes bk-pop{0%{transform:scale(1);opacity:1}55%{transform:scale(1.45);opacity:.85}100%{transform:scale(1.75);opacity:0}}
    .bk-b.puf{animation:bk-puf .55s ease-out!important}
    @keyframes bk-puf{0%{transform:scale(1)}40%{transform:scale(1.26);opacity:0}70%{transform:scale(.72);opacity:0}100%{transform:scale(1);opacity:1}}

    /* Ekstra sæbebobler, der stiger op under festen */
    .bk-festboble{position:absolute;border-radius:50%;z-index:6;pointer-events:none;
      background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.95) 0 14%,rgba(255,255,255,.32) 15% 26%,
        rgba(170,225,250,.35) 60%,rgba(120,190,230,.5));
      border:2px solid rgba(255,255,255,.85);box-shadow:inset -3px -4px 8px rgba(70,160,215,.3);
      animation:bk-festboble 4s ease-in forwards}
    @keyframes bk-festboble{0%{transform:translate(0,0) scale(.4);opacity:0}
      15%{opacity:.95}
      100%{transform:translate(var(--dx,0),-72vh) scale(1);opacity:0}}

    /* Vandstråle fra næbbet */
    /* Dråberne har en mørkere blå kerne og hvid kant, så de kan ses både mod vandet og fliserne */
    .bk-draabe{position:absolute;width:clamp(11px,2vh,19px);aspect-ratio:1;margin:-6px 0 0 -6px;
      border-radius:50% 50% 50% 50%/60% 60% 40% 40%;z-index:6;pointer-events:none;
      background:radial-gradient(circle at 34% 28%,#fff 0 18%,#6cc6f2 45%,#1f86c9);
      box-shadow:0 0 0 2px rgba(255,255,255,.9),0 2px 4px rgba(31,58,95,.25);
      animation:bk-draabe .85s ease-out forwards}
    @keyframes bk-draabe{0%{transform:translate(0,0) scale(.5);opacity:1}
      55%{transform:translate(calc(var(--dx) * .7),var(--dy)) scale(1);opacity:1}
      100%{transform:translate(var(--dx),calc(var(--dy) + 60px)) scale(.8);opacity:0}}

    @media (prefers-reduced-motion:reduce){
      .bk-b,.bk-dukke .dk,.bk-dukke::after,.bk-boelge,.bk-skum span,.bk-prik{animation:none!important}
      .bk-draabe,.bk-festboble{display:none}
      .bk-dukke.lille{transition:opacity .2s}
    }
  `);

  let root, alive, timers, busy, score, target, sidste, helSaetning = false;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = sel => root.querySelector(sel);

  /* ---------- Små lyde, som ikke findes i shared.js ---------- */
  // Vandplask: kort, lys støj
  function plask(sek = .25, styrke = .16) {
    try {
      const a = Spil.audio(), n = Math.max(1, a.sampleRate * sek | 0);
      const b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
      f.type = "highpass"; f.frequency.value = 800;
      g.gain.setValueAtTime(styrke, t); g.gain.exponentialRampToValueAtTime(.0001, t + sek);
      s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + sek);
    } catch (e) {}
  }
  // Andefløjt: to korte kvæk med faldende tone
  function kvak() {
    try {
      const a = Spil.audio(), t0 = a.currentTime;
      for (let i = 0; i < 2; i++) {
        const t = t0 + i * .17, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(760, t);
        o.frequency.exponentialRampToValueAtTime(360, t + .13);
        f.type = "lowpass"; f.frequency.value = 1500;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.2, t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + .15);
        o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + .2);
      }
    } catch (e) {}
  }

  /* ---------- Boblerne ---------- */
  // En rund, femtakket stjerne (tegnet, så den ser ens ud på alle skærme)
  const STJERNE = `<path d="M20 2.5l5.2 10.9 11.9 1.6-8.7 8.3 2.2 11.8L20 29.4 9.4 35.1l2.2-11.8-8.7-8.3 11.9-1.6z"/>`;
  function tegnStjerner() {
    // Ved 5. rigtige vises alle 5 stjerner, indtil festen begynder
    const on = busy && score > 0 && score % 5 === 0 ? 5 : score % 5;
    q(".bk-stjerner").innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<svg class="${i < on ? "on" : ""}" viewBox="0 0 40 38" aria-hidden="true">${STJERNE}</svg>`).join("");
  }

  function sporg(praise) {
    if (!alive || !target || busy) return;
    const tekst = praise != null ? ROS[praise] + " " : "";
    Spil.say(`${tekst}Pop boblen med ${ORD[target - 1]}!`, null,
      praise != null ? [`ros-${praise}`, `bad-pop-${target}`] : `bad-pop-${target}`);
  }

  function nyRunde(praise, intro) {
    if (!alive) return;
    busy = false;
    tegnStjerner();

    // Flere tal og flere bobler, når barnet har prøvet nogle stykker
    const antal = score < 5 ? 3 : score < 10 ? 4 : 5;
    const maxTal = score < 5 ? 5 : score < 10 ? 7 : 10;
    const pulje = [];
    for (let n = 1; n <= maxTal; n++) pulje.push(n);

    target = Spil.shuffle(pulje.filter(n => n !== sidste))[0];
    sidste = target;
    const tal = Spil.shuffle([target, ...Spil.shuffle(pulje.filter(n => n !== target)).slice(0, antal - 1)]);

    const lag = q(".bk-bobler");
    lag.innerHTML = "";
    const pladser = PLADSER[antal];
    tal.forEach((n, i) => {
      const ramme = document.createElement("div");
      ramme.className = "bk-boble";
      ramme.style.left = (pladser[i][0] * 100) + "%";
      ramme.style.top = (pladser[i][1] * 100) + "%";
      const b = document.createElement("button");
      b.className = "bk-b";
      b.textContent = n;
      b.setAttribute("aria-label", `Boble med tallet ${ORD[n - 1]}`);
      b.style.setProperty("--fd", (i * .07).toFixed(2) + "s");
      b.style.setProperty("--bd", (.6 + i * .18).toFixed(2) + "s");
      b.style.setProperty("--bobt", (3.2 + (i % 3) * .55).toFixed(2) + "s");
      b.onclick = e => { e.stopPropagation(); tryk(b, n); };
      ramme.appendChild(b);
      lag.appendChild(ramme);
    });

    if (intro) Spil.say(`Hej! Lad os bade! Pop boblen med ${ORD[target - 1]}!`, null, ["bad-hej", `bad-pop-${target}`]);
    else sporg(praise);
  }

  function tryk(btn, n) {
    if (!alive || busy) return;
    if (n === target) {
      busy = true;
      Spil.stopTalking(); // afbryd eventuel "Det er ..." fra et forkert tryk
      btn.classList.add("popper");
      Spil.burstAt(btn, "🫧✨⭐💫");
      Spil.sfx.pop(); plask(.2, .14); kvak();
      score++; tegnStjerner();
      later(() => { const d = q(".bk-dukke"); if (d) { d.classList.remove("hop"); void d.offsetWidth; d.classList.add("hop"); } }, 300);
      later(() => { if (score % 5 === 0) fest(); else nyRunde(Math.random() * ROS.length | 0); }, 950);
    } else {
      // Blid feedback: boblen popper og kommer igen, og stemmen siger tallet
      btn.classList.remove("puf"); void btn.offsetWidth; btn.classList.add("puf");
      Spil.tone([380, 250], .13, "triangle");
      // Hele sætninger ("Det er fem.") i stedet for "Det er" + et løst tal, så det lyder naturligt.
      // Indtil de nye lydfiler er lavet, bruges de gamle stykker, så Mic-stemmen stadig taler.
      Spil.say(`Det er ${ORD[n - 1]}. Pop boblen med ${ORD[target - 1]}!`, null,
        helSaetning ? [`bad-er-${n}`, `bad-pop-${target}`] : ["bad-det-er", `tal-${n}`, `bad-pop-${target}`]);
      later(() => btn.classList.remove("puf"), 620);
    }
  }

  function sproejt() {
    const naeb = q(".bk-dukke .naeb"), scene = q(".bk-scene");
    if (!naeb || !scene) return;
    const r = naeb.getBoundingClientRect(), s = scene.getBoundingClientRect();
    // Anden kigger mod højre, så strålen sprøjter frem og op fra næbbet i en bue
    for (let i = 0; i < 22; i++) {
      const d = document.createElement("div");
      d.className = "bk-draabe";
      d.style.left = (r.right - s.left) + "px";
      d.style.top = (r.top + r.height / 2 - s.top) + "px";
      const vinkel = -Math.PI * (.2 + Math.random() * .3), fart = 90 + Math.random() * 140;
      d.style.setProperty("--dx", (Math.cos(vinkel) * fart * 1.3).toFixed(0) + "px");
      d.style.setProperty("--dy", (Math.sin(vinkel) * fart).toFixed(0) + "px");
      d.style.animationDelay = (i / 22 * .3).toFixed(2) + "s";
      scene.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    }
  }

  // Små sæbebobler, der stiger op fra vandet under festen
  function festBobler() {
    const scene = q(".bk-scene"), vand = q(".bk-vand");
    if (!scene || !vand) return;
    const s = scene.getBoundingClientRect(), v = vand.getBoundingClientRect();
    for (let i = 0; i < 9; i++) {
      const d = document.createElement("div");
      d.className = "bk-festboble";
      const str = 18 + Math.random() * 26;
      d.style.width = str + "px"; d.style.height = str + "px";
      d.style.left = (v.left - s.left + Math.random() * v.width) + "px";
      d.style.top = (v.top - s.top + v.height * .25) + "px";
      d.style.setProperty("--dx", ((Math.random() - .5) * 70).toFixed(0) + "px");
      d.style.animationDelay = (Math.random() * .9).toFixed(2) + "s";
      scene.appendChild(d);
      setTimeout(() => d.remove(), 5400);
    }
  }

  function fest() {
    if (!alive) return;
    busy = true;
    tegnStjerner();
    q(".bk-bobler").innerHTML = "";
    const and = q(".bk-dukke");
    and.classList.remove("hop"); void and.offsetWidth; and.classList.add("hop");
    Spil.sfx.fanfare(); plask(.7, .2); kvak(); sproejt(); festBobler();
    later(() => { sproejt(); plask(.35, .14); }, 1100);
    later(() => { sproejt(); plask(.35, .14); }, 2200);
    [...q(".bk-aelinger").children].forEach((d, i) => later(() => {
      d.classList.add("vis");
      plask(.18, .1);
    }, 220 + i * 280));
    Spil.say("Fem bobler! Sikke en fest!", null, "bad-fest");
    const konfetti = () => { if (alive) Spil.burst(innerWidth * (.12 + Math.random() * .76), innerHeight * (.16 + Math.random() * .45), "🎉⭐🫧✨💫🎈"); };
    konfetti(); konfetti(); later(konfetti, 500); later(konfetti, 1000); later(konfetti, 1600); later(konfetti, 2200);
    later(() => {
      [...q(".bk-aelinger").children].forEach(d => d.classList.remove("vis"));
      nyRunde(Math.random() * ROS.length | 0);
    }, 3600);
  }

  // Skummet lægges som en stribe løse, hvide bobler langs vandoverfladen.
  // Størrelsen følger vandets højde, så det ser ens ud i liggende og stående format.
  function lavSkum() {
    const lag = q(".bk-skum");
    if (!alive || !lag) return;
    const w = lag.clientWidth, h = lag.clientHeight;
    if (!w || !h) return;
    const bund = h * .5;
    lag.innerHTML = "";
    const sæt = (d, x, y, bag) => {
      const s = document.createElement("span");
      if (bag) s.className = "bag";
      s.style.width = d + "px";
      s.style.height = d * (.8 + Math.random() * .34) + "px";
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.animationDelay = (-Math.random() * 6).toFixed(2) + "s";
      s.style.animationDuration = (4.5 + Math.random() * 3).toFixed(2) + "s";
      lag.appendChild(s);
    };
    // Bageste række: store bobler
    const n = Math.max(4, Math.round(w / (bund * .95)));
    for (let i = 0; i < n; i++)
      sæt(bund * (1.05 + Math.random() * .55), (i / n) * (w + bund) - bund * .6,
        -bund * .3 + Math.random() * bund * .5, true);
    // Forreste række: mindre bobler, der dækker overgangen til vandet
    const m = Math.max(5, Math.round(w / (bund * .72)));
    for (let i = 0; i < m; i++)
      sæt(bund * (.6 + Math.random() * .55), (i / m) * (w + bund) - bund * .5,
        bund * (.45 + Math.random() * .5), false);
    // Et par helt små bobler foran
    for (let i = 0; i < Math.max(2, m / 4 | 0); i++)
      sæt(bund * (.3 + Math.random() * .22), Math.random() * w,
        bund * (.8 + Math.random() * .3), false);
  }

  /* ---------- Ællinger og and: markup ---------- */
  const AND = `<div class="dk"><div class="hale"></div><div class="krop"></div><div class="vinge"></div>
    <div class="hoved"></div><div class="naeb"></div><div class="oje"></div></div>`;

  Spil.register({
    id: "badekarret", navn: "Badekarret", ikon: "🛁", farve: "var(--sky)",
    start(r) {
      Spil.preload(["bad-hej", "bad-fest",
        ...ORD.map((_, i) => `bad-pop-${i + 1}`),
        "bad-det-er", ...ORD.map((_, i) => `tal-${i + 1}`),
        ...ROS.map((_, i) => `ros-${i}`)]);
      // De hele "Det er ..."-sætninger findes som lydfiler (bad-er-1 ... bad-er-10)
      helSaetning = true;
      Spil.preload(ORD.map((_, i) => `bad-er-${i + 1}`));
      root = r; alive = true; timers = []; busy = false; score = 0; target = null; sidste = 0;

      root.innerHTML = `<div class="bk">
        <div class="bk-top"><div class="bk-stjerner" aria-label="Stjerner"></div></div>
        <button class="bk-sig" aria-label="Sig det igen">🔊</button>
        <div class="bk-scene">
          <div class="bk-prik" style="left:86%;top:18%;width:clamp(16px,3vh,32px);aspect-ratio:1;animation-duration:8s"></div>
          <div class="bk-prik" style="left:72%;top:8%;width:clamp(10px,2vh,20px);aspect-ratio:1;animation-duration:6s;animation-delay:-2s"></div>
          <div class="bk-prik" style="left:9%;top:56%;width:clamp(12px,2.4vh,24px);aspect-ratio:1;animation-duration:7s;animation-delay:-4s"></div>
          <div class="bk-bobler"></div>
          <div class="bk-kar">
            <div class="bk-fod v"></div><div class="bk-fod h"></div>
            <div class="bk-krop"></div>
            <div class="bk-vand">
              <svg class="bk-boelge" viewBox="0 0 240 26" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id="bk-boelge-farve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#fff" stop-opacity=".75"/>
                  <stop offset="1" stop-color="#fff" stop-opacity="0"/>
                </linearGradient></defs>
                <path d="M0 13 Q 7.5 4 15 13 T 30 13 T 45 13 T 60 13 T 75 13 T 90 13 T 105 13 T 120 13 T 135 13 T 150 13 T 165 13 T 180 13 T 195 13 T 210 13 T 225 13 T 240 13 V 26 H0 Z"
                  fill="url(#bk-boelge-farve)"/>
              </svg>
              <svg class="bk-boelge b2" viewBox="0 0 240 26" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 13 Q 7.5 4 15 13 T 30 13 T 45 13 T 60 13 T 75 13 T 90 13 T 105 13 T 120 13 T 135 13 T 150 13 T 165 13 T 180 13 T 195 13 T 210 13 T 225 13 T 240 13 V 26 H0 Z"
                  fill="url(#bk-boelge-farve)" opacity=".7"/>
              </svg>
              <div class="bk-skum"></div>
              <div class="bk-dukke">${AND}</div>
              <div class="bk-aelinger">
                <div class="bk-dukke lille" style="left:52%;bottom:30%;--sd:.9s">${AND}</div>
                <div class="bk-dukke lille" style="left:68%;bottom:16%;--sd:1.4s">${AND}</div>
                <div class="bk-dukke lille" style="left:82%;bottom:34%;--sd:.4s">${AND}</div>
              </div>
            </div>
            <div class="bk-saebe"></div>
            <svg class="bk-hane" viewBox="0 0 100 100" aria-hidden="true">
              <defs><linearGradient id="bk-krom" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d3dde6"/><stop offset="1" stop-color="#8ea2b3"/>
              </linearGradient></defs>
              <path d="M74 92 V42 Q74 16 50 16 Q28 16 28 36 V44" fill="none" stroke="url(#bk-krom)" stroke-width="12" stroke-linecap="round"/>
              <path d="M70 88 V43 Q70 21 50 21" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
              <rect x="21" y="42" width="14" height="8" rx="3" fill="#7f93a5"/>
              <rect x="54" y="86" width="40" height="12" rx="6" fill="url(#bk-krom)"/>
              <circle cx="56" cy="78" r="9" fill="url(#bk-krom)"/><circle cx="56" cy="78" r="4.5" fill="#ff6b6b"/>
              <circle cx="92" cy="78" r="9" fill="url(#bk-krom)"/><circle cx="92" cy="78" r="4.5" fill="#4aa8e8"/>
            </svg>
          </div>
        </div>
      </div>`;

      q(".bk-sig").onclick = () => sporg();
      q(".bk-kar").onclick = () => sporg();
      lavSkum();
      addEventListener("resize", lavSkum);
      // Dybe links til test (index.html?spil=badekarret&dyb=...):
      // "niveau-2" = 4 bobler med tal op til 7, "niveau-3" = 5 bobler med tal op til 10,
      // "fest" = festen med ællinger med det samme, "forkert" = et forkert tryk efter et øjeblik.
      const dyb = Spil.dyb || "";
      if (dyb === "niveau-2") score = 5;
      if (dyb === "niveau-3") score = 10;
      if (dyb === "fest") { score = 5; fest(); return; }
      // Første replik hilser og beder om det første tal
      nyRunde(null, true);
      if (dyb === "forkert") later(() => {
        const forkert = [...root.querySelectorAll(".bk-b")].find(b => +b.textContent !== target);
        if (forkert) forkert.click();
      }, 900);
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      removeEventListener("resize", lavSkum);
    }
  });
})();
