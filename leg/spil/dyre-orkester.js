// Spil: Dyre-orkester — fem dyr på en scene, hvert med sin tone i en glad skala.
// Frit spil: tryk på dyrene og lav musik. 🎵-knappen starter "lyt og spil efter":
// dyrene spiller en kort melodi (2 toner, senere 3 og 4), og barnet gentager den.
// Rigtigt giver ros og fest, forkert giver et blidt "Prøv igen!", og melodien spilles igen.
// Ingen tabe-tilstand. Orkestret dirigeres af en pingvin med taktstok.
(function () {
  // Tonerne danner en glad skala (C-dur uden F og H), så alt lyder pænt sammen.
  const DYR = [
    { e: "🐄", ins: "🥁", navn: "Koen", f: 261.63, type: "triangle", h: [1, .3, .12], c1: "#ffe6a1", c2: "#efb234" },
    { e: "🐈", ins: "🎻", navn: "Katten", f: 293.66, type: "sine", h: [1, .42, .1], c1: "#cfe9ff", c2: "#5fa8dd" },
    { e: "🐕", ins: "🎺", navn: "Hunden", f: 329.63, type: "triangle", h: [1, .22, .16], c1: "#ffd8c9", c2: "#ef855c" },
    { e: "🐸", ins: "🎸", navn: "Frøen", f: 392.0, type: "sine", h: [1, .5, .06], c1: "#d6f5c2", c2: "#6fc255" },
    { e: "🦆", ins: "🎷", navn: "Anden", f: 440.0, type: "triangle", h: [1, .34, .06], c1: "#ffe1f0", c2: "#e884b6" },
  ];
  const ROS = ["Super!", "Flot klaret!", "Sejt!", "Du er god til det!", "Wow!"];
  // Pynt i baggrunden: små noder og lysglimt (kun pynt, ikke noget man kan trykke på)
  const NODER = [["♪", 7, 20, 0], ["♫", 82, 12, 1.2], ["♩", 91, 36, 2.4], ["♪", 13, 44, 3.2],
    ["♫", 63, 28, 1.7], ["♬", 36, 9, 2.6], ["♪", 47, 42, 4.1], ["♩", 25, 11, 3.6]];
  const GLIMT = [[10, 9], [23, 31], [44, 15], [57, 47], [70, 7], [87, 25], [93, 47], [31, 47], [78, 44]];

  Spil.css("css-dyre-orkester", `
    .do{height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:clamp(3px,.9vh,10px);
      padding-block:calc(1.4vh + env(safe-area-inset-top,0px)) calc(1vh + env(safe-area-inset-bottom,0px));
      padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px));
      background:radial-gradient(120% 80% at 50% -10%,#4a3577 0%,#2b1f4f 46%,#180e2f 100%);
      color:#fff8e7;overflow:hidden}

    /* Stjerner og den lille instruktion (teksten er kun pynt, stemmen fortæller) */
    .do-top{display:flex;justify-content:center;align-items:center;min-height:clamp(28px,5vh,52px)}
    .do-stars{display:flex;gap:clamp(4px,.9vw,10px);font-size:clamp(20px,3.4vh,34px);line-height:1}
    .do-stars span{opacity:.26;filter:grayscale(1);transition:transform .25s,opacity .25s}
    .do-stars span.on{opacity:1;filter:none;transform:scale(1.14)}
    .do-prompt{text-align:center;font-weight:800;font-size:clamp(20px,4vh,44px);line-height:1.05;
      min-height:1.15em;color:#ffe9b0;text-shadow:0 3px 0 rgba(0,0,0,.35)}

    /* Scenen: tæppe, spots og dansegulv */
    .do-scene{position:relative;flex:1;min-height:0;overflow:hidden;border-radius:clamp(16px,2.6vh,32px);
      background:radial-gradient(90% 72% at 50% 0%,#6b4e9f 0%,#3d2b6b 46%,#241a45 100%);
      box-shadow:inset 0 0 70px rgba(0,0,0,.5),0 8px 0 rgba(0,0,0,.16)}
    .do-beam{position:absolute;top:-4%;left:50%;width:clamp(150px,40vw,470px);height:118%;pointer-events:none;z-index:2;
      transform:translateX(-50%) rotate(var(--r));
      transform-origin:50% 0;mix-blend-mode:screen;filter:blur(6px);opacity:.9;
      clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);
      animation:do-sway 9s ease-in-out infinite alternate}
    .do-beam.b1{--r:-16deg;left:26%;background:linear-gradient(180deg,rgba(255,236,160,.55),rgba(255,236,160,.1) 60%,transparent 88%)}
    .do-beam.b2{--r:0deg;left:50%;background:linear-gradient(180deg,rgba(190,235,255,.45),rgba(190,235,255,.08) 62%,transparent 88%)}
    .do-beam.b3{--r:16deg;left:74%;background:linear-gradient(180deg,rgba(255,200,230,.5),rgba(255,200,230,.09) 60%,transparent 88%)}
    @keyframes do-sway{from{transform:translateX(-50%) rotate(calc(var(--r) - 5deg))}
      to{transform:translateX(-50%) rotate(calc(var(--r) + 5deg))}}
    /* Pynt i baggrunden: små noder og stjerner, der blinker og driver */
    .do-sky{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
    .do-sky span{position:absolute;color:rgba(255,240,190,.3);font-size:clamp(18px,3.4vh,34px);line-height:1;
      text-shadow:0 0 14px rgba(255,230,150,.3);animation:do-drift 15s ease-in-out infinite alternate}
    .do-sky i{position:absolute;width:clamp(3px,.5vh,5px);aspect-ratio:1;border-radius:50%;background:#fff6cf;
      box-shadow:0 0 10px 3px rgba(255,240,180,.5);animation:do-tvink 3.6s ease-in-out infinite}
    @keyframes do-drift{from{transform:translate(0,0) rotate(-6deg)}to{transform:translate(16px,-24px) rotate(9deg)}}
    @keyframes do-tvink{0%,100%{opacity:.85;transform:scale(1)}40%{opacity:.2;transform:scale(.65)}}
    .do-valance{position:absolute;top:0;left:0;right:0;height:clamp(20px,4.4vh,48px);z-index:5;pointer-events:none;
      background:
        radial-gradient(circle at 50% 0,#cf2b40 0 60%,transparent 62%) 0 40%/clamp(22px,4.2vw,52px) 60% repeat-x,
        linear-gradient(#d63448 0%,#a4162a 100%) 0 0/100% 48% no-repeat;
      filter:drop-shadow(0 7px 10px rgba(0,0,0,.45))}
    /* En lille pære i hver bue af tæppekanten (samme bredde som buerne, så de passer) */
    .do-valance::after{content:"";position:absolute;left:0;right:0;top:50%;height:clamp(7px,1.3vh,13px);
      background:radial-gradient(circle closest-side,#fffbe2 0 52%,rgba(255,236,160,.55) 66%,transparent 100%) 0 0/clamp(22px,4.2vw,52px) 100% repeat-x;
      filter:drop-shadow(0 0 6px #ffd76a);opacity:.9;animation:do-tvink 3.2s ease-in-out infinite}
    /* Sidetæpperne er draperet og bundet op med et guldbånd; de står bag gulvet */
    .do-curtain{position:absolute;top:0;height:84%;width:clamp(30px,7.2vw,96px);z-index:2;pointer-events:none;
      filter:drop-shadow(4px 0 8px rgba(0,0,0,.4))}
    .do-curtain.l{left:0}
    .do-curtain.r{right:0;transform:scaleX(-1)}
    .do-curtain::before{content:"";position:absolute;inset:0;
      background:
        linear-gradient(90deg,rgba(0,0,0,.25),transparent 30%,transparent 70%,rgba(0,0,0,.2)),
        repeating-linear-gradient(90deg,#9c1427 0 9%,#d63a4c 9% 17%,#b72236 17% 24%);
      clip-path:polygon(0 0,100% 0,90% 10%,72% 28%,50% 47%,36% 58%,45% 66%,60% 81%,70% 100%,0 100%)}
    /* Guldbåndet med en lille kvast */
    .do-curtain::after{content:"";position:absolute;left:-4%;top:55.5%;width:46%;height:clamp(7px,1.5vh,14px);
      border-radius:999px;background:linear-gradient(#ffe48a,#d9a21a);box-shadow:0 2px 3px rgba(0,0,0,.35)}
    .do-floor{position:absolute;left:-8%;right:-8%;bottom:-1%;height:42%;pointer-events:none;z-index:3;
      border-radius:50% 50% 0 0/24% 24% 0 0;
      background:
        repeating-linear-gradient(90deg,rgba(0,0,0,.09) 0 1px,transparent 1px 9%),
        linear-gradient(180deg,#aa7240 0%,#8a5526 55%,#5d3617 100%);
      box-shadow:inset 0 16px 34px rgba(0,0,0,.35)}

    /* Lyskæden blinker kun med lysstyrken (do-tvink skalerede den også, så den krympede ind mod midten) */
    .do-valance::after{filter:drop-shadow(0 0 5px #ffd76a);opacity:1;animation-name:do-lys}
    @keyframes do-lys{0%,100%{opacity:1}45%{opacity:.55}}

    /* De fem dyr */
    .do-band{position:absolute;left:0;right:0;bottom:14%;z-index:6;display:flex;align-items:flex-end;justify-content:center;
      gap:clamp(2px,1.3vw,22px);padding-inline:clamp(4px,1.6vw,18px);box-sizing:border-box}
    .do-animal{position:relative;flex:0 1 auto;width:clamp(60px,16vmin,154px);aspect-ratio:1;background:none;padding:0;
      border-radius:50%;transition:transform .12s;touch-action:manipulation}
    .do-pad{position:absolute;inset:2%;border-radius:50%;
      background:radial-gradient(circle at 50% 28%,var(--c1),var(--c2));
      box-shadow:0 7px 0 rgba(0,0,0,.28),inset 0 -6px 0 rgba(0,0,0,.12),inset 0 6px 0 rgba(255,255,255,.28);
      transition:transform .16s,box-shadow .16s,filter .16s}
    .do-emoji{position:relative;font-size:clamp(36px,9.2vmin,88px);line-height:1;
      filter:drop-shadow(0 5px 6px rgba(0,0,0,.32));animation:do-bob 3.2s ease-in-out infinite;animation-delay:var(--d)}
    /* På brede skærme er der plads til større dyr */
    @media (min-aspect-ratio:1/1){
      .do-animal{width:min(23vmin,17.5vw,200px)}
      .do-emoji{font-size:clamp(44px,12.4vmin,112px)}
    }
    /* På en telefon må teksten ikke gemme sig bag hjem-knappen */
    @media (max-width:560px){
      .do-prompt{padding-left:clamp(46px,13vw,70px);padding-right:2px;font-size:clamp(19px,3.7vh,30px)}
      .do-maestro{font-size:clamp(30px,5.2vh,46px)}
    }
    /* På højkant: to rækker (3 + 2), så dyrene er store nok til små fingre */
    @media (max-aspect-ratio:3/4){
      .do-band{flex-wrap:wrap;align-items:center;row-gap:clamp(10px,2.4vh,22px);column-gap:clamp(6px,2.4vw,16px);bottom:7%;padding-inline:2vw}
      .do-animal{width:min(27.5vw,150px)}
      .do-emoji{font-size:min(16.5vw,86px)}
    }
    @keyframes do-bob{50%{transform:translateY(-7%) rotate(-2deg)}}
    .do-animal:active .do-pad{transform:translateY(4px) scale(.97);box-shadow:0 2px 0 rgba(0,0,0,.28)}
    .do-animal.hop .do-emoji{animation:do-hop .55s cubic-bezier(.3,1.5,.5,1)}
    @keyframes do-hop{35%{transform:translateY(-34%) scale(1.14) rotate(6deg)}70%{transform:translateY(0) scale(.96)}}
    /* Dyret lyser op, når det spiller i melodien */
    /* Hele knappen løftes (emojiens egen transform tages af vippe-animationen) */
    .do-animal.glow{z-index:2;transform:translateY(-10%) scale(1.13)}
    .do-animal.glow .do-pad{filter:brightness(1.3) saturate(1.2);
      box-shadow:0 0 0 6px #fff3c4,0 0 50px 22px rgba(255,226,120,.75),0 7px 0 rgba(0,0,0,.28)}
    @media (prefers-reduced-motion:reduce){.do-animal.glow{transform:none}}
    .do-animal.ok .do-pad{box-shadow:0 0 0 6px #fff3c4,0 0 46px 18px rgba(255,240,150,.75),0 7px 0 rgba(0,0,0,.28)}
    .do-animal.nej .do-emoji{animation:do-wobble .45s ease-in-out}
    @keyframes do-wobble{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
    /* Hvert dyr har sit instrument i en lille cirkel nederst til højre */
    .do-animal{container-type:inline-size}
    .do-ins{position:absolute;right:-3%;bottom:1%;width:38%;aspect-ratio:1;border-radius:50%;
      display:grid;place-items:center;font-size:20px;font-size:21cqw;line-height:1;
      background:radial-gradient(circle at 50% 32%,#fffdf3,#f3e4c4);
      box-shadow:0 4px 0 rgba(0,0,0,.25),inset 0 -3px 0 rgba(0,0,0,.08);transform:rotate(-8deg)}
    .do-animal.hop .do-ins{animation:do-wobble .45s ease-in-out}

    /* Noder og stjerner, der flyver op fra dyret */
    .do-layer{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}
    .do-fly{position:absolute;font-size:clamp(18px,2.8vh,30px);line-height:1;color:#fff6cf;
      text-shadow:0 2px 8px rgba(0,0,0,.35);animation:do-fly 1.05s ease-out forwards}
    @keyframes do-fly{from{opacity:1;transform:translate(0,0) scale(.7)}
      35%{opacity:1;transform:translate(calc(var(--dx)*.6),-46px) scale(1.15)}
      to{opacity:0;transform:translate(var(--dx),-112px) scale(.85)}}
    @keyframes do-fly-rolig{from{opacity:1}to{opacity:0}}

    /* Dirigenten og den store gule knap */
    .do-bar{position:relative;flex:none;display:flex;align-items:center;justify-content:center;
      min-height:clamp(76px,12.4vh,112px)}
    .do-maestro{position:absolute;left:clamp(0px,1.4vw,26px);bottom:0;display:block;font-size:clamp(34px,7.2vh,62px);
      line-height:1;pointer-events:none;filter:drop-shadow(0 6px 8px rgba(0,0,0,.45))}
    .do-maestro .do-peng{display:block;animation:do-bob 2.6s ease-in-out infinite}
    /* Dirigentens lille podie, så pingvinen ikke svæver i hjørnet */
    .do-podie{display:block;width:1.25em;height:.26em;margin:-.17em -.12em 0;border-radius:.08em .08em .03em .03em;
      background:linear-gradient(180deg,#e0ad5e 0 22%,#9c6630 22% 100%);box-shadow:0 .05em 0 #5d3617,inset 0 -.04em 0 rgba(0,0,0,.2)}
    .do-baton{position:absolute;right:2%;top:12%;width:clamp(3px,.5vh,5px);height:48%;border-radius:6px;
      background:linear-gradient(#fffbe0,#ffd24d);transform-origin:50% 100%;transform:rotate(20deg);
      box-shadow:0 0 10px #ffe58a;transition:transform .15s}
    .do-baton::after{content:"";position:absolute;left:50%;top:-5px;width:200%;aspect-ratio:1;transform:translateX(-50%);
      border-radius:50%;background:#fff3b0}
    .do-maestro.wave .do-baton{animation:do-wave .6s ease-in-out infinite}
    @keyframes do-wave{0%,100%{transform:rotate(24deg)}50%{transform:rotate(-26deg)}}
    .do-maestro.bow .do-peng{animation:do-bow .7s ease-in-out}
    @keyframes do-bow{40%{transform:translateY(8%) rotate(-14deg) scale(.94)}}

    .do-knapper{display:flex;gap:clamp(10px,2.4vw,24px);align-items:center}
    .do-play,.do-fri{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
      min-width:clamp(100px,22vh,168px);height:clamp(62px,10.2vh,94px);padding:0 clamp(14px,3vw,30px);
      border-radius:999px;background:linear-gradient(180deg,#ffe89c,#ffc93c 56%,#eaa92a);
      box-shadow:0 7px 0 #b9820f,0 14px 26px rgba(0,0,0,.35);color:#4a2c00;
      font-weight:800;font-size:clamp(11px,1.8vh,17px);line-height:1;transition:transform .12s,box-shadow .12s}
    .do-play .do-note,.do-fri .do-note{font-size:clamp(28px,5.4vh,44px);line-height:1}
    .do-play.on .do-note,.do-fri.on .do-note{animation:do-beat 1.9s ease-in-out infinite}
    /* Den knap, der ikke er valgt, er lys og stille */
    .do-play:not(.on),.do-fri:not(.on){background:linear-gradient(180deg,#fffaf0,#efe3ff);box-shadow:0 7px 0 #a99bc9,0 14px 26px rgba(0,0,0,.3);color:#3d2f63}
    .do-fri:active{transform:translateY(5px)}
    .do-play:active{transform:translateY(5px);box-shadow:0 2px 0 #b9820f,0 7px 14px rgba(0,0,0,.3)}
    @keyframes do-beat{50%{transform:scale(1.13) rotate(-8deg)}}

    /* Fest efter fem stjerner */
    .do-party{position:fixed;inset:0;z-index:9;display:grid;place-items:center;align-content:center;
      background:radial-gradient(72% 58% at 50% 46%,#8a63c9 0%,#4a3177 46%,#1d1236 100%)}
    .do-party::before{content:"⭐ ⭐ ⭐ ⭐ ⭐";position:absolute;top:9%;left:50%;transform:translateX(-50%);
      font-size:clamp(22px,min(5.6vh,7.5vw),52px);letter-spacing:.1em;white-space:nowrap}
    /* En lyskegle oppefra ned på dyrene */
    .do-party::after{content:"";position:absolute;left:50%;top:0;height:64%;width:min(96vw,980px);pointer-events:none;
      transform:translateX(-50%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);
      background:linear-gradient(180deg,rgba(255,236,160,.42),rgba(255,236,160,.08) 80%,transparent)}
    .do-party .do-dans{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;
      gap:clamp(6px,2vw,26px);width:min(100%,1000px);padding-inline:max(12px,env(safe-area-inset-left,0px));box-sizing:border-box;
      font-size:clamp(44px,min(13vh,24vw),116px)}
    /* Dyrene danser på et rundt scenegulv af træ */
    .do-party .do-dans::before{content:"";position:absolute;z-index:-1;left:2%;right:2%;bottom:-.38em;height:.78em;border-radius:50%;
      background:radial-gradient(60% 70% at 50% 40%,rgba(255,230,150,.55),transparent 70%),
        repeating-linear-gradient(90deg,rgba(0,0,0,.1) 0 2px,transparent 2px 9%),
        linear-gradient(180deg,#b57a45,#8a5526 60%,#5d3617);
      box-shadow:0 10px 0 #4a2a10,0 22px 40px rgba(0,0,0,.45)}
    .do-party b{font-size:1em;line-height:1;animation:do-dans 1s ease-in-out infinite;
      filter:drop-shadow(0 8px 10px rgba(0,0,0,.35))}
    @keyframes do-dans{50%{transform:translateY(-26%) rotate(8deg) scale(1.08)}}

    .do-top.skjult{visibility:hidden}
    /* Telefon: smallere knapper, og plads til pingvinen til venstre */
    @media (orientation:portrait){.do-knapper{margin-left:clamp(44px,13vw,66px)}
      .do-play,.do-fri{min-width:0;width:clamp(108px,34vw,160px);padding:0 8px}}
    @media (prefers-reduced-motion:reduce){
      .do-beam,.do-emoji,.do-maestro .do-peng,.do-play .do-note,.do-fri .do-note,.do-baton,.do-sky span,.do-sky i,.do-valance::after{animation:none}
      .do-animal.hop .do-emoji,.do-animal.hop .do-ins,.do-animal.nej .do-emoji,.do-party b{animation:none}
      .do-fly{animation:do-fly-rolig 1.2s ease-out forwards}
    }
  `);

  let root, alive, timers, animals, mode, melody, pos, score, seq, live, stk, dirigent;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);
  const stillParty = () => mode === "fest";

  /* ---------- Lyd: et lille "pling" pr. dyr ---------- */
  function stopNotes() {
    live.forEach(o => { try { o.stop(0); } catch (e) {} });
    live.clear();
  }

  // Spiller dyr nr. i, evt. forskudt "when" sekunder (til melodier). Dur og styrke kan ændres.
  function pling(i, when = 0, dur = .6, vol = .24) {
    const d = DYR[i]; if (!d) return;
    try {
      const a = Spil.audio(), t = a.currentTime + Math.max(0, when) + .02;
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2800;
      const out = a.createGain();
      out.gain.setValueAtTime(.0001, t);
      out.gain.exponentialRampToValueAtTime(vol, t + .018);
      out.gain.exponentialRampToValueAtTime(.0001, t + dur);
      out.connect(lp).connect(a.destination);
      // Grundtone plus et par overtoner giver hvert dyr sin lille klang.
      d.h.forEach((amp, n) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = d.type;
        o.frequency.setValueAtTime(d.f * (n + 1), t);
        o.frequency.linearRampToValueAtTime(d.f * (n + 1) * 1.006, t + .09);
        g.gain.value = amp;
        o.connect(g).connect(out);
        o.start(t); o.stop(t + dur + .12);
        live.add(o);
        o.onended = () => live.delete(o);
      });
    } catch (e) {}
  }

  /* ---------- Små effekter ---------- */
  function hop(el) {
    if (!el) return;
    el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
    later(() => el.classList.remove("hop"), 600);
  }

  function fly(el, tegn = "♪♫🎵") {
    const layer = q(".do-layer"); if (!layer || !el) return;
    const r = el.getBoundingClientRect(), s = layer.getBoundingClientRect();
    const n = 1 + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) {
      const d = document.createElement("span");
      d.className = "do-fly";
      const t = [...tegn]; // emoji som 🎵 fylder to tegn i en streng, så del dem rigtigt op
      d.textContent = t[Math.random() * t.length | 0];
      d.style.left = (r.left - s.left + r.width * (.2 + Math.random() * .6)) + "px";
      d.style.top = (r.top - s.top + r.height * .12) + "px";
      d.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px");
      d.style.animationDelay = (k * 80) + "ms";
      layer.appendChild(d);
      later(() => d.remove(), 1200 + k * 80);
    }
  }

  function glow(i, ms = 460) {
    const el = animals[i]; if (!el) return;
    el.classList.add("glow");
    later(() => el.classList.remove("glow"), ms);
  }

  function clearMarks() {
    animals.forEach(el => el.classList.remove("glow", "ok", "nej", "hop"));
    q(".do-maestro").classList.remove("wave", "bow");
  }

  function setPrompt(t) { q(".do-prompt").textContent = t; }

  // Vis hvilken tilstand der er valgt, og skjul stjernerne i frit spil
  function visTilstand() {
    const fri = mode === "fri";
    q(".do-fri").classList.toggle("on", fri);
    q(".do-play").classList.toggle("on", !fri);
    q(".do-top").classList.toggle("skjult", fri);
  }

  // Frit spil: bare tryk på dyrene og lav musik. Et igangværende stykke stoppes pænt.
  function friSpil() {
    if (!alive) return;
    stk++; seq++;               // gamle timere og replikker fra "lyt og spil efter" gør ingenting
    stopNotes(); clearMarks();
    root.querySelectorAll(".do-party").forEach(p => p.remove());
    const varFri = mode === "fri";
    mode = "fri";
    setPrompt("Tryk på dyrene!");
    visTilstand();
    Spil.sfx.click();
    if (!varFri) Spil.say("Nu spiller vi frit! Tryk på dyrene.", null, "orkester-fri");
  }

  function drawStars() {
    const on = stillParty() && score > 0 && score % 5 === 0 ? 5 : score % 5;
    q(".do-stars").innerHTML = Array.from({ length: 5 },
      (_, i) => `<span class="${i < on ? "on" : ""}">⭐</span>`).join("");
  }

  // Sig noget, og gå videre når replikken er færdig — men også hvis den bliver afbrudt.
  function sayThen(tekst, noegler, ms, fn) {
    const mine = ++seq; let done = false;
    const run = () => { if (done || !alive || mine !== seq) return; done = true; fn(); };
    Spil.say(tekst, run, noegler);
    later(run, ms);
  }

  /* ---------- Melodien ---------- */
  const antalToner = () => score < 2 ? 2 : score < 4 ? 3 : 4;

  function nyMelodi() {
    const n = antalToner(), m = [];
    for (let i = 0; i < n; i++) {
      let k = Math.random() * DYR.length | 0;
      // Højst to ens toner efter hinanden, så melodien bliver mere end en trommen
      if (i >= 2 && m[i - 1] === k && m[i - 2] === k) k = (k + 1 + (Math.random() * (DYR.length - 1) | 0)) % DYR.length;
      m.push(k);
    }
    if (m.every(x => x === m[0])) m[m.length - 1] = (m[0] + 2) % DYR.length;
    return m;
  }

  // Spiller melodien op med lys i dyrene, og giver derefter turen til barnet.
  function spilMelodi() {
    if (!alive) return;
    stopNotes();
    mode = "lyt"; pos = 0;
    const mit = stk;
    setPrompt("Lyt godt efter!");
    q(".do-maestro").classList.add("wave");
    const mellemrum = .62, start = .12;
    melody.forEach((i, k) => {
      pling(i, start + k * mellemrum, .58);
      later(() => { if (stk === mit) { glow(i, 430); fly(animals[i]); } }, (start + k * mellemrum) * 1000);
    });
    later(() => {
      if (!alive || stk !== mit) return;
      q(".do-maestro").classList.remove("wave");
      mode = "svar"; pos = 0;
      setPrompt("Spil det efter!");
      Spil.say("Spil det efter!", null, "orkester-efter");
    }, (start + melody.length * mellemrum) * 1000 + 140);
  }

  // Starter et nyt "lyt og spil efter": stemmen siger til, før melodien kommer.
  function startLyt() {
    if (!alive) return;
    stopNotes(); clearMarks();
    mode = "lyt"; pos = 0;
    visTilstand();
    setPrompt("Lyt godt efter!");
    drawStars();
    Spil.sfx.click();
    sayThen("Lyt godt efter!", "orkester-lyt", 2300, spilMelodi);
  }

  function nytStk() {
    melody = nyMelodi();
    startLyt();
  }

  /* ---------- Barnets tryk ---------- */
  function trykDyr(i, el) {
    if (!alive) return;
    pling(i);
    hop(el);
    fly(el);
    if (mode === "fri") {
      // Pingvinen dirigerer med, så længe barnet spiller
      const m = q(".do-maestro");
      m.classList.add("wave");
      clearTimeout(dirigent);
      dirigent = setTimeout(() => alive && mode === "fri" && m.classList.remove("wave"), 900);
      return;
    }
    if (mode === "svar") svar(i, el);
  }

  function svar(i, el) {
    if (mode !== "svar") return;
    if (melody[pos] === i) {
      pos++;
      el.classList.add("ok");
      later(() => el.classList.remove("ok"), 520);
      if (pos >= melody.length) {
        // Lås svaret med det samme, så et ekstra tryk ikke bliver opfattet som forkert
        mode = "pause";
        later(win, 240);
      }
    } else {
      mode = "pause";
      el.classList.add("nej");
      later(() => el.classList.remove("nej"), 520);
      later(() => Spil.sfx.wrong(), 160);
      setPrompt("Prøv igen!");
      // Blid feedback, og så spilles den samme melodi igen.
      sayThen("Prøv igen!", "orkester-proev-igen", 2000, spilMelodi);
    }
  }

  function win() {
    if (!alive || mode !== "pause") return;
    mode = "fest"; score++;
    drawStars();
    setPrompt("Sikke et orkester!");
    Spil.sfx.fanfare();
    q(".do-maestro").classList.remove("wave");
    q(".do-maestro").classList.add("bow");
    animals.forEach((el, k) => {
      later(() => hop(el), k * 80);
      later(() => { fly(el, "🎉⭐✨"); Spil.burstAt(el, "🎉✨🎵⭐"); }, 90 + k * 80);
    });
    // Rosen kommer lige efter fanfaren (ca. 0,85 s), så stemmen ikke drukner i den
    const ros = score % 5;
    later(() => { if (mode === "fest") Spil.say(ROS[ros], null, "ros-" + ros); }, 850);
    later(() => {
      if (!alive || mode !== "fest") return;
      q(".do-maestro").classList.remove("bow");
      if (score % 5 === 0) fest(); else nytStk();
    }, 3000);
  }

  function fest() {
    const p = document.createElement("div");
    p.className = "do-party";
    p.innerHTML = `<div class="do-dans">${
      Spil.shuffle(DYR.slice()).map((a, i) =>
        `<b style="animation-delay:${(i * .11).toFixed(2)}s">${a.e}</b>`).join("")}</div>`;
    root.appendChild(p);
    Spil.sfx.fanfare();
    const mit = stk;
    // Også her venter stemmen, til fanfaren er færdig
    later(() => { if (stk === mit) Spil.say("Fem stjerner! Sikke en koncert!", null, "orkester-fest"); }, 850);
    const konfetti = () => {
      if (!alive) return;
      Spil.burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.15 + Math.random() * 0.5), "🎉⭐🎈✨🎊🎵");
    };
    konfetti(); later(konfetti, 550); later(konfetti, 1100); later(konfetti, 1650);
    // Man kan trykke for mere konfetti — eller bare vente, så går festen videre af sig selv.
    p.onpointerdown = e => {
      Spil.sfx.pop();
      Spil.burst(e.clientX, e.clientY, "🎉⭐🎈✨🎊🎵");
    };
    later(() => {
      p.remove();
      if (stk !== mit) return;  // man er skiftet til frit spil imens
      score = 0; drawStars();   // festen er slut, og et nyt stykke begynder forfra med to toner
      if (alive) nytStk();
    }, 4200);                   // replikken (2,5 s) skal nå at blive færdig efter fanfaren
  }

  Spil.register({
    id: "dyre-orkester", navn: "Dyre-orkester", ikon: "🎺", farve: "#ffd6a5",
    start(r) {
      Spil.preload(["orkester-hej", "orkester-lyt", "orkester-efter", "orkester-proev-igen",
        "orkester-fri", "orkester-fest", "ros-0", "ros-1", "ros-2", "ros-3", "ros-4"]);
      root = r; alive = true; timers = []; live = new Set();
      mode = "fri"; melody = []; pos = 0; score = 0; seq = 0; stk = 0; dirigent = 0;

      const pynt = NODER.map(([c, x, y, d]) =>
        `<span style="left:${x}%;top:${y}%;animation-delay:${d}s">${c}</span>`).join("")
        + GLIMT.map(([x, y], i) =>
          `<i style="left:${x}%;top:${y}%;animation-delay:${(i * .37).toFixed(1)}s"></i>`).join("");

      root.innerHTML = `<div class="do">
        <div class="do-top"><div class="do-stars" aria-label="Stjerner"></div></div>
        <div class="do-prompt">Tryk på dyrene!</div>
        <div class="do-scene">
          <div class="do-beam b1"></div><div class="do-beam b2"></div><div class="do-beam b3"></div>
          <div class="do-sky" aria-hidden="true">${pynt}</div>
          <div class="do-curtain l"></div><div class="do-curtain r"></div>
          <div class="do-valance"></div>
          <div class="do-floor"></div>
          <div class="do-band"></div>
          <div class="do-layer"></div>
        </div>
        <div class="do-bar">
          <div class="do-maestro" aria-hidden="true">
            <span class="do-baton"></span>
            <span class="do-peng">🐧</span>
            <span class="do-podie"></span>
          </div>
          <div class="do-knapper">
            <button class="do-fri on" aria-label="Spil frit">
              <span class="do-note">🎹</span><span>Spil frit</span>
            </button>
            <button class="do-play" aria-label="Lyt og spil efter">
              <span class="do-note">🎵</span><span>Lyt og spil efter</span>
            </button>
          </div>
        </div></div>`;

      const band = q(".do-band");
      animals = DYR.map((d, i) => {
        const b = document.createElement("button");
        b.className = "do-animal";
        b.setAttribute("aria-label", d.navn);
        b.style.setProperty("--d", (i * .23).toFixed(2) + "s");
        b.style.setProperty("--c1", d.c1);
        b.style.setProperty("--c2", d.c2);
        b.innerHTML = `<span class="do-pad"></span><span class="do-emoji">${d.e}</span><span class="do-ins" aria-hidden="true">${d.ins}</span>`;
        b.onclick = () => trykDyr(i, b);
        band.appendChild(b);
        return b;
      });

      q(".do-play").onclick = () => {
        if (!alive) return;
        if (mode === "fri" || mode === "fest" || !melody.length) melody = nyMelodi();
        startLyt();          // midt i et stykke: samme melodi spilles igen som hjælp
      };
      q(".do-fri").onclick = friSpil;
      q(".do-prompt").onclick = () => { if (alive && mode === "svar") startLyt(); };
      drawStars(); visTilstand();

      // Dybe links til test: lyt, svar, svar-3 (tre stjerner), vundet, fest
      const dyb = Spil.dyb || "", m = /^svar(?:-(\d))?$/.exec(dyb);
      if (dyb === "lyt") { melody = nyMelodi(); startLyt(); }
      else if (m) {
        score = Math.min(4, +(m[1] || 0)); melody = nyMelodi();
        mode = "svar"; visTilstand(); drawStars(); setPrompt("Spil det efter!");
      }
      else if (dyb === "vundet") { melody = nyMelodi(); mode = "pause"; visTilstand(); drawStars(); later(win, 200); }
      else if (dyb === "fest") { score = 5; mode = "fest"; visTilstand(); drawStars(); setPrompt("Sikke et orkester!"); fest(); }
      else Spil.say("Hej! Tryk på dyrene, og lav musik!", null, "orkester-hej");
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      clearTimeout(dirigent);
      stopNotes();
      try { Spil.stopTalking(); } catch (e) {}
    }
  });
})();
