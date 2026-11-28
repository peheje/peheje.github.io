// Spil: Toget — et farverigt tog kører gennem eng, bro, tunnel, nat, regnbue og strand.
// Toget ruller ind på en station, og barnet vælger selv tre dyr blandt dem på perronen
// ved at trykke på dem. Mellem stationerne kører toget gennem et levende landskab,
// hvor barnet kan tude i lokomotivet (turbo!), trykke på dyrene i vinduerne og lege med landskabet.
// Ingen tabe-tilstand.
(function () {
  // dyr: [id/lydnøgle, bestemt form, ubestemt form, sprite-sti]
  const ANIMALS = [
    ["ko", "koen", "en ko", "billeder/dyrlaegen/ko.webp"],
    ["kat", "katten", "en kat", "billeder/dyrlaegen/kat.webp"],
    ["hund", "hunden", "en hund", "billeder/dyrlaegen/hund.webp"],
    ["gris", "grisen", "en gris", "billeder/dyrlaegen/gris.webp"],
    ["and", "anden", "en and", "billeder/lommelygten/and.webp"],
    ["faar", "fåret", "et får", "billeder/dyrlaegen/faar.webp"],
    ["hest", "hesten", "en hest", "billeder/lommelygten/hest.webp"],
    ["elefant", "elefanten", "en elefant", "billeder/dyrlaegen/elefant.webp"],
    ["abe", "aben", "en abe", "billeder/dyrlaegen/abe.webp"],
    ["ugle", "uglen", "en ugle", "billeder/lommelygten/ugle.webp"],
    ["hoene", "hønen", "en høne", "billeder/lommelygten/hoene.webp"],
    ["froe", "frøen", "en frø", "billeder/dyrlaegen/froe.webp"]
  ];
  const CARS = ["#ff8fb1", "#ffd166", "#8bd17c"];
  const STATIONER = 4; // 4 stationer × 3 dyr = alle 12 dyr kommer med til festen!
  const SCENER = ["eng", "by", "skov", "eng"]; // baggrund ved hver station
  const REJSER = ["bro", "tunnel", "bakker", "nat", "regnbue", "strand"]; // oplevelse mellem stationerne

  // 4 tegnede gemmesteder på perronen (ren SVG i stedet for løse emojis)
  const SPOTS_SVG = {
    kuffert: `<svg viewBox="0 0 120 96" aria-hidden="true">
      <path d="M42 22 V14 Q42 8 48 8 H72 Q78 8 78 14 V22" fill="none" stroke="#6b3e26" stroke-width="6" stroke-linecap="round"/>
      <rect x="12" y="22" width="96" height="66" rx="14" fill="#e85d5d" stroke="#2f3b52" stroke-width="4.5"/>
      <rect x="12" y="22" width="96" height="14" rx="8" fill="#ff7b7b" opacity=".55"/>
      <rect x="30" y="22" width="12" height="66" fill="#ffd166" stroke="#2f3b52" stroke-width="3.5"/>
      <rect x="78" y="22" width="12" height="66" fill="#ffd166" stroke="#2f3b52" stroke-width="3.5"/>
      <rect x="27" y="48" width="18" height="10" rx="3" fill="#fff3c4" stroke="#2f3b52" stroke-width="3"/>
      <rect x="75" y="48" width="18" height="10" rx="3" fill="#fff3c4" stroke="#2f3b52" stroke-width="3"/>
      <circle cx="60" cy="54" r="10" fill="#fff6d6" stroke="#2f3b52" stroke-width="3"/>
      <path d="M56 54 L60 49 L64 54 L60 59 Z" fill="#5aa9e6"/>
    </svg>`,
    kurv: `<svg viewBox="0 0 120 96" aria-hidden="true">
      <path d="M24 38 Q60 -4 96 38" fill="none" stroke="#8a562c" stroke-width="7" stroke-linecap="round"/>
      <path d="M14 36 H106 L96 86 Q95 90 90 90 H30 Q25 90 24 86 Z" fill="#e0a96d" stroke="#2f3b52" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M20 52 H100 M23 68 H97 M42 36 L45 90 M60 36 V90 M78 36 L75 90" stroke="#a8703b" stroke-width="3" opacity=".7"/>
      <rect x="10" y="28" width="100" height="14" rx="7" fill="#ff8f8f" stroke="#2f3b52" stroke-width="4"/>
      <path d="M24 28 V42 M42 28 V42 M60 28 V42 M78 28 V42 M96 28 V42" stroke="#fffdf7" stroke-width="4"/>
    </svg>`,
    kasse: `<svg viewBox="0 0 120 96" aria-hidden="true">
      <rect x="14" y="24" width="92" height="64" rx="8" fill="#d9a166" stroke="#2f3b52" stroke-width="4.5"/>
      <rect x="14" y="24" width="92" height="16" rx="5" fill="#e8b882" stroke="#2f3b52" stroke-width="4"/>
      <line x1="16" y1="56" x2="104" y2="56" stroke="#8f5c30" stroke-width="3.5"/>
      <line x1="16" y1="72" x2="104" y2="72" stroke="#8f5c30" stroke-width="3.5"/>
      <rect x="44" y="44" width="32" height="22" rx="4" fill="#fffaf0" stroke="#2f3b52" stroke-width="3"/>
      <path d="M50 53 H70 M50 59 H64" stroke="#e85d5d" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    busk: `<svg viewBox="0 0 120 96" aria-hidden="true">
      <path d="M28 62 H92 L86 88 Q85 91 81 91 H39 Q35 91 34 88 Z" fill="#d67a4b" stroke="#2f3b52" stroke-width="4.5" stroke-linejoin="round"/>
      <rect x="22" y="54" width="76" height="12" rx="6" fill="#e89062" stroke="#2f3b52" stroke-width="4"/>
      <path d="M22 56 C10 48 16 26 34 26 C40 12 64 8 76 20 C94 14 112 32 100 50 C98 55 94 56 90 56 Z" fill="#6cc56c" stroke="#2f3b52" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="38" cy="36" r="6" fill="#ffd166" stroke="#2f3b52" stroke-width="2.5"/>
      <circle cx="66" cy="28" r="6" fill="#ff8fb1" stroke="#2f3b52" stroke-width="2.5"/>
      <circle cx="84" cy="42" r="5.5" fill="#fffdf7" stroke="#2f3b52" stroke-width="2.5"/>
    </svg>`
  };
  const SPOT_KEYS = ["kuffert", "kurv", "kasse", "busk"];

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mod = (a, b) => ((a % b) + b) % b;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  Spil.css("css-toget", `
    .tg{position:absolute;inset:0;overflow:hidden;--ph:26vh;
      --lw:clamp(104px,21vmin,215px);--cw:clamp(80px,16.5vmin,168px);--gs:clamp(98px,min(20vmin,25vh),176px);
      color:var(--ink);touch-action:manipulation;user-select:none}
    @media (max-aspect-ratio:1/1){.tg{--ph:25vh;--lw:clamp(92px,24vw,146px);--cw:clamp(70px,18.5vw,116px);--gs:clamp(82px,22vw,122px)}}
    @media (max-height:560px){.tg{--ph:20vh;--lw:clamp(84px,15vmin,132px);--cw:clamp(62px,11.5vmin,104px);--gs:clamp(74px,18vh,112px)}}

    .tg-cv{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;touch-action:manipulation}

    /* ---------- Toget ---------- */
    .tg-train{position:absolute;left:0;right:0;bottom:calc(var(--ph) + 5.6vh);display:flex;justify-content:center;
      align-items:flex-end;gap:.8vh;z-index:5;will-change:transform;pointer-events:none}
    .tg-train>*{pointer-events:auto}
    .tg-loco{position:relative;flex:0 0 auto;width:var(--lw);height:calc(var(--lw)*.8);
      font-size:calc(var(--lw)*.1);background:none;padding:0;border:0}
    .tg-loco.hop{animation:tg-hop .42s ease-out}
    @keyframes tg-hop{30%{transform:translateY(-10%)}60%{transform:translateY(0)}80%{transform:translateY(-3%)}}
    .tg-loco .boiler{position:absolute;left:1%;bottom:20%;width:62%;height:45%;z-index:1;
      border-radius:48% 12% 10% 48%/50% 12% 10% 50%;
      background:linear-gradient(#ff9b9b,#ff6b6b 45%,#e04b4b);box-shadow:inset 0 .5em 0 rgba(255,255,255,.35),0 3px 0 rgba(31,58,95,.22)}
    .tg-loco .cab{position:absolute;right:1%;bottom:20%;width:40%;height:64%;z-index:1;
      border-radius:16% 20% 8% 8%/14% 18% 8% 8%;
      background:linear-gradient(#ff8f8f,#e8474f);box-shadow:inset 0 .5em 0 rgba(255,255,255,.28),0 3px 0 rgba(31,58,95,.22)}
    .tg-loco .window{position:absolute;right:12%;bottom:48%;width:18%;height:24%;border-radius:14%;
      background:#d6ecff;box-shadow:inset 0 0 0 .25em #2f4a6d;z-index:2}
    .tg-loco .roof{position:absolute;right:0;bottom:82%;width:44%;height:10%;border-radius:999px;background:#2f4a6d;z-index:2}
    .tg-loco .chimney{position:absolute;left:12%;bottom:62%;width:11%;height:24%;background:#2f4a6d;z-index:2;border-radius:.2em .2em 0 0}
    .tg-loco .chimney::after{content:"";position:absolute;left:-32%;right:-32%;top:-16%;height:30%;background:#3d5c85;border-radius:.15em}
    .tg-loco .lamp{position:absolute;left:0;bottom:46%;width:12%;aspect-ratio:1;border-radius:50%;z-index:3;
      background:radial-gradient(circle at 40% 35%,#fffce0,#ffd166);box-shadow:0 0 1.4em #ffe89a}
    .tg-loco .beam{position:absolute;right:96%;bottom:16%;width:155%;height:64%;pointer-events:none;z-index:2;
      background:linear-gradient(270deg,rgba(255,244,170,.72),rgba(255,244,170,0));
      clip-path:polygon(100% 38%,100% 62%,0 100%,0 0);opacity:0;transition:opacity .35s}
    .tg-loco .eye{position:absolute;bottom:42%;width:14%;aspect-ratio:1;border-radius:50%;background:#fff;z-index:3;
      box-shadow:inset 0 0 0 .2em #2f4a6d}
    .tg-loco .eye::after{content:"";position:absolute;left:24%;top:28%;width:44%;height:44%;border-radius:50%;background:#1f3a5f}
    .tg-loco .e1{left:20%}.tg-loco .e2{left:38%}
    .tg-loco .mouth{position:absolute;left:21%;bottom:30%;width:18%;height:9%;z-index:3;
      border-bottom:.5em solid #a83c3c;border-radius:0 0 60% 60%}
    .wheel{position:absolute;bottom:-2%;aspect-ratio:1;border-radius:50%;z-index:0;
      background:
        radial-gradient(circle,#ffd166 0 15%,#c99a2e 16% 21%,transparent 22%),
        repeating-conic-gradient(from var(--spin,0deg),#3a5273 0 11deg,transparent 11deg 60deg),
        radial-gradient(circle,#eaf1f8 0 63%,#2b3a52 64% 100%);
      box-shadow:0 .3vh 0 rgba(0,0,0,.22)}
    .tg-loco .w1{left:2%;width:24%}.tg-loco .w2{left:31%;width:24%}.tg-loco .w3{left:60%;width:24%}
    .tg-loco .rod{position:absolute;left:14%;width:58%;bottom:13%;height:4.6%;z-index:3;border-radius:999px;
      background:linear-gradient(#ff8f8f,#d94b4b);box-shadow:0 .2vh 0 rgba(0,0,0,.2)}

    .tg-cars{position:relative;display:flex;align-items:flex-end;gap:.8vh;flex:0 0 auto}
    .tg-car{position:relative;flex:0 0 auto;width:var(--cw);height:calc(var(--cw)*.8);border-radius:14% 14% 8% 8%;
      background:var(--c);padding:0;border:0;touch-action:none;cursor:grab;
      box-shadow:inset 0 -.9vh 0 rgba(0,0,0,.12),0 3px 0 rgba(31,58,95,.22);transition:transform .15s}
    .tg-car.drop-hover{transform:scale(1.08);box-shadow:inset 0 -.9vh 0 rgba(0,0,0,.12),0 0 0 .65vh #fff59d,0 6px 14px rgba(31,58,95,.3)}
    .tg-car::before{content:"";position:absolute;left:-1.05vh;top:62%;width:1.25vh;height:.7vh;
      background:#2f4a6d;border-radius:2px}
    .tg-car .roof{position:absolute;left:-1%;right:-1%;top:-9%;height:18%;border-radius:999px;background:#2f4a6d}
    .tg-car .win{position:absolute;left:9%;right:9%;top:14%;bottom:24%;border-radius:12%;overflow:hidden;
      background:#eaf7ff;box-shadow:inset 0 0 0 .35vh rgba(47,74,109,.35);display:grid;place-items:center}
    .tg-car .seat{position:absolute;left:20%;right:20%;bottom:6%;height:26%;border-radius:999px;background:#cfe3f2;transition:opacity .2s}
    .tg-car .who{width:88%;height:88%;display:grid;place-items:center;transform:scale(0);
      transition:transform .38s cubic-bezier(.3,1.6,.5,1);position:relative;z-index:1}
    .tg-car .who img{width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}
    .tg-car.full .who{transform:scale(1)}
    .tg-car.full .seat{opacity:0}
    .tg-car.full{box-shadow:inset 0 -.9vh 0 rgba(0,0,0,.12),0 0 0 .45vh #fff9c4,0 3px 0 rgba(31,58,95,.22)}
    .tg-car.pop{animation:tg-carpop .48s ease-out}
    @keyframes tg-carpop{35%{transform:translateY(-11%) scale(1.06)}70%{transform:translateY(0) scale(.99)}}
    .tg-car .wheel{width:25%}
    .tg-car .wheel.l{left:9%}.tg-car .wheel.r{right:9%}
    .tg-steam{position:absolute;left:12%;bottom:84%;width:1.25em;height:1.25em;border-radius:50%;z-index:4;
      background:radial-gradient(circle at 34% 32%,#fff,#e7f1f8);pointer-events:none;
      box-shadow:0 0 0 .22em rgba(255,255,255,.45);animation:tg-puff 1.2s ease-out forwards}
    @keyframes tg-puff{from{opacity:.95;transform:translate(0,0) scale(.5)}
      to{opacity:0;transform:translate(var(--dx,14px),-3.5em) scale(var(--sc,2.1))}}

    /* ---------- Tunnel-mørke over toget når det kører igennem tunnelen ---------- */
    .tg-tunnel{position:absolute;inset:0;z-index:6;pointer-events:none;
      background:radial-gradient(circle at 46% 58%,rgba(12,18,44,.12) 0%,rgba(10,16,38,.78) 62%);
      opacity:0;transition:opacity .35s}
    .tg.i-tunnel .tg-tunnel{opacity:1}
    .tg.i-tunnel .tg-loco .beam,.tg.i-nat .tg-loco .beam{opacity:1}

    /* ---------- Perron ---------- */
    .tg-platform{position:absolute;left:0;right:0;bottom:0;height:var(--ph);z-index:7;
      background:linear-gradient(#f2ead8,#dfd4bc 62%,#cfc1a6);
      box-shadow:inset 0 .4vh 0 rgba(255,255,255,.7);
      transition:transform .55s ease-in-out}
    .tg-platform::before{content:"";position:absolute;left:0;right:0;top:0;height:1.1vh;
      background:repeating-linear-gradient(90deg,#ffd166 0 3vh,#ffe8ad 3vh 6vh)}
    .tg-platform::after{content:"";position:absolute;left:0;right:0;bottom:0;height:14%;
      background:repeating-linear-gradient(90deg,rgba(0,0,0,.045) 0 1px,rgba(0,0,0,0) 1px 4vh)}
    .tg.koerer .tg-platform{transform:translateY(105%)}

    /* ---------- 4 tegnede gemmesteder på perronen ---------- */
    .tg-spots{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 1.2vh);
      height:calc(var(--ph) + 8vh);z-index:8;pointer-events:none;
      display:flex;align-items:flex-end;justify-content:space-evenly;padding:0 max(2vw,8px);
      transition:transform .5s ease-in-out,opacity .4s}
    .tg.koerer .tg-spots{transform:translateY(115%);opacity:0}
    .gz{position:relative;width:var(--gs);height:var(--gs);padding:0;background:none;border:0;pointer-events:auto;touch-action:none;cursor:grab}
    .gz.drop-hover .gz-dak{transform:scale(1.08) translateY(-6%);filter:drop-shadow(0 0 1.2vh rgba(255,245,157,.98))}
    .dragging .gz-dyr,.dragging .who{opacity:0 !important}
    .gz-dak{position:absolute;left:4%;right:4%;bottom:0;height:66%;z-index:2;
      filter:drop-shadow(0 .5vh .4vh rgba(31,58,95,.22));transform-origin:50% 100%}
    .gz-dak svg{width:100%;height:100%;display:block;overflow:visible}
    .gz-dyr{position:absolute;left:12%;right:12%;bottom:38%;height:68%;z-index:1;
      display:grid;place-items:center;opacity:0;transform:translateY(48%) scale(.65)}
    .gz-dyr img{width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none;
      filter:drop-shadow(0 4px 5px rgba(31,58,95,.2))}
    .gz.aktiv .gz-dyr{opacity:1;animation:tg-kig 2s ease-in-out infinite}
    @keyframes tg-kig{0%,100%{transform:translateY(4%) rotate(-3deg)}50%{transform:translateY(-10%) rotate(3deg)}}
    .gz.aktiv .gz-dak{animation:tg-dak 2s ease-in-out infinite}
    @keyframes tg-dak{0%,100%{transform:rotate(0)}50%{transform:rotate(-1.8deg)}}
    .gz.ud .gz-dyr{animation:none;opacity:1;transform:translateY(-30%) scale(1.16);transition:transform .24s cubic-bezier(.3,1.6,.5,1)}
    .gz.ud .gz-dak{animation:none;transform:rotate(-7deg) translateY(3%)}
    .gz.vaek .gz-dyr{opacity:0;animation:none}
    .gz.ryst .gz-dak{animation:tg-ryst .42s ease-out}
    @keyframes tg-ryst{20%,60%{transform:rotate(-7deg)}40%,80%{transform:rotate(7deg)}}
    .gz.kom .gz-dak{animation:tg-kom .4s ease-out backwards}
    @keyframes tg-kom{from{transform:scale(.5);opacity:0}}
    .gz.hint .gz-dak{animation:tg-hintdak .95s ease-in-out infinite;
      filter:drop-shadow(0 0 1.2vh rgba(255,235,120,.98)) drop-shadow(0 0 .5vh rgba(255,235,120,.95))}
    @keyframes tg-hintdak{50%{transform:translateY(-9%) scale(1.07)}}

    /* Flyvende dyr der hopper i en bue ind i togvognen */
    .tg-ghost{position:absolute;z-index:9;pointer-events:none;width:calc(var(--gs)*.75);height:calc(var(--gs)*.75);
      transform:translate(-50%,-50%)}
    .tg-ghost.drag{z-index:15;transform:translate(-50%,-50%) scale(1.12)}
    .tg-ghost img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(31,58,95,.25))}

    /* ---------- Besked & fremgangsprikker ---------- */
    .tg-prompt{position:absolute;left:50%;top:calc(3vh + env(safe-area-inset-top,0px));transform:translateX(-50%);
      z-index:9;font-weight:800;font-size:clamp(24px,min(5.8vh,7.5vw),56px);white-space:nowrap;
      padding:.12em .65em;border-radius:999px;background:rgba(255,253,247,.92);box-shadow:0 5px 0 rgba(31,58,95,.18);
      pointer-events:none}
    .tg-prompt:empty{display:none}
    @media (max-width:560px){.tg-prompt{top:calc(9.5vh + env(safe-area-inset-top,0px))}}

    /* ---------- Fest til sidst ---------- */
    .tg-party{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:2vh;padding:2vh;
      background:radial-gradient(circle at 50% 40%,#fffdf2,#fff0b8);
      animation:tg-fade .4s ease-out}
    @keyframes tg-fade{from{opacity:0}}
    .tg-hurra{font-weight:800;font-size:clamp(34px,8.5vh,84px);color:#e8474f;text-shadow:0 4px 0 #ffd166}
    .tg-parade{display:grid;grid-template-columns:repeat(6,1fr);gap:1.8vmin;
      width:min(92vw,860px)}
    @media (max-aspect-ratio:1/1){.tg-parade{grid-template-columns:repeat(4,1fr);width:min(92vw,420px)}}
    .tg-parade button{display:grid;place-items:center;aspect-ratio:1;border-radius:50%;background:var(--c);padding:10%;border:0;
      box-shadow:inset 0 -.5vh 0 rgba(0,0,0,.08),0 .5vh 0 rgba(31,58,95,.14);
      animation:tg-wave 1s ease-in-out infinite alternate}
    .tg-parade button:nth-child(2n){animation-delay:-.5s}
    .tg-parade button:active{transform:scale(.92)}
    .tg-parade img{width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}
    .tg-vimpler{position:absolute;left:max(110px,12vw);right:3vw;top:calc(2vh + env(safe-area-inset-top,0px));
      height:9vh;display:flex;justify-content:space-between;pointer-events:none}
    .tg-vimpler::before{content:"";position:absolute;left:0;right:0;top:-.3vh;height:2.5vh;
      border-bottom:.4vh solid #c9a26b;border-radius:0 0 50% 50%/0 0 100% 100%}
    .tg-vimpler i{width:6%;height:min(7vh,9vw);background:var(--c);clip-path:polygon(0 0,100% 0,50% 100%);
      transform:translateY(var(--y));transform-origin:50% 0}
    @keyframes tg-wave{from{transform:rotate(-6deg) translateY(0)}to{transform:rotate(6deg) translateY(-6%)}}

    @media (prefers-reduced-motion:reduce){
      .tg-loco.hop,.tg-car.pop,.tg-party,.tg-parade button{animation:none}
      .gz.aktiv .gz-dyr,.gz.aktiv .gz-dak,.gz.kom .gz-dak,.gz.ryst .gz-dak,.gz.hint .gz-dak{animation:none}
      .gz.aktiv .gz-dyr{transform:none}
      .tg-car .who{transition:none}
    }
  `);

  let root, cv, ctx, alive, timers, raf = 0, lastT = 0, W = 0, H = 0, clock = 0,
    hjul = 0, trainX = 0, camX = 0, turbo = 0, chugAcc = 0,
    tween = null, rideT = 0, rideDur = 7.0, rideFrom = 0, rideTo = 0, worldLegs = [],
    phase = "", deck = [], dyr = [],
    boarded = 0, station = 0, sunSpin = 0, millBoost = 0,
    clouds = [], drops = [], sparks = [];
  const LEG = 3.0; // skærmbredder mellem hver station i den sammenhængende verden
  const toX = wx => W * .5 + (wx - camX) * W;
  const byggVerden = () => {
    const r = Spil.shuffle(REJSER.slice());
    worldLegs = Array.from({ length: STATIONER - 1 }, (_, i) => r[i % r.length]);
  };
  const el = {};
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);

  /* ---------- Opbygning ---------- */
  function bygg() {
    root.innerHTML = `<div class="tg">
      <canvas class="tg-cv" aria-hidden="true"></canvas>
      <div class="tg-train">
        <button class="tg-loco" aria-label="Lokomotivet">
          <span class="beam"></span>
          <span class="wheel w1"></span><span class="wheel w2"></span><span class="wheel w3"></span>
          <span class="boiler"></span><span class="cab"></span><span class="window"></span><span class="roof"></span>
          <span class="chimney"></span><span class="lamp"></span><span class="eye e1"></span><span class="eye e2"></span>
          <span class="mouth"></span><span class="rod"></span>
        </button>
        <div class="tg-cars"></div>
      </div>
      <div class="tg-tunnel" aria-hidden="true"></div>
      <div class="tg-platform" aria-hidden="true"></div>
      <div class="tg-spots">
        ${SPOT_KEYS.map(k => `<button class="gz" data-k="${k}" aria-label="Et gemmested"><span class="gz-dyr"></span><span class="gz-dak">${SPOTS_SVG[k]}</span></button>`).join("")}
      </div>
      <div class="tg-prompt" aria-hidden="true"></div>
    </div>`;

    el.tg = q(".tg"); cv = q(".tg-cv"); ctx = cv.getContext("2d");
    el.train = q(".tg-train"); el.cars = q(".tg-cars"); el.rod = q(".tg-loco .rod");
    el.loco = q(".tg-loco"); el.prompt = q(".tg-prompt");
    el.spots = [...root.querySelectorAll(".gz")];
    el.spots.forEach(sp => { sp.onpointerdown = e => startDrag(e, "spot", sp); });

    for (let i = 0; i < 3; i++) {
      const d = document.createElement("button");
      d.className = "tg-car"; d.style.setProperty("--c", CARS[i]); d.setAttribute("aria-label", "Togvogn");
      d.innerHTML = `<span class="roof"></span>
        <span class="win"><span class="seat"></span><span class="who"></span></span>
        <span class="wheel l"></span><span class="wheel r"></span>`;
      d.onpointerdown = e => startDrag(e, "car", d);
      el.cars.appendChild(d);
    }
    el.carEls = [...el.cars.children];
    el.wheels = [...root.querySelectorAll(".wheel")];
    el.loco.onclick = () => {
      if (!alive) return;
      tut(false);
      if (phase === "ride") turbo = 1.1;
    };
    cv.onclick = trykLandskab;

    clouds = [
      { x: .14, y: .16, s: 1.05, v: .012 },
      { x: .52, y: .22, s: .85, v: .008 },
      { x: .82, y: .15, s: .92, v: .01 }
    ];
  }

  function resize() {
    if (!alive) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = el.tg.clientWidth || innerWidth;
    H = el.tg.clientHeight || innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- Tegnet landskab på canvas (ingen løse emojis) ---------- */
  function phPx() {
    const p = root.querySelector(".tg-platform");
    return p ? p.offsetHeight : H * .25;
  }

  function drawCloud(x, y, s) {
    ctx.save();
    const p = new Path2D();
    p.moveTo(x - s * .72, y + s * .24);
    p.arc(x - s * .46, y + s * .06, s * .28, Math.PI * .5, Math.PI * 1.45);
    p.arc(x - s * .14, y - s * .12, s * .34, Math.PI * 1.05, Math.PI * 1.88);
    p.arc(x + s * .26, y - s * .06, s * .3, Math.PI * 1.15, Math.PI * 1.95);
    p.arc(x + s * .52, y + s * .08, s * .24, Math.PI * 1.35, Math.PI * .5);
    p.closePath();
    ctx.fillStyle = "#ffffff"; ctx.fill(p);
    ctx.clip(p);
    ctx.fillStyle = "#dceefb"; ctx.fillRect(x - s, y + s * .14, s * 2, s * .2);
    ctx.restore();
  }

  function drawSun(sx, sy, r) {
    ctx.save(); ctx.translate(sx, sy);
    const g = ctx.createRadialGradient(0, 0, r * .4, 0, 0, r * 2.1);
    g.addColorStop(0, "rgba(255,235,140,.75)"); g.addColorStop(1, "rgba(255,235,140,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(clock * .2 + sunSpin * 3);
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = Math.max(3, r * .13); ctx.lineCap = "round";
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
      ctx.lineTo(Math.cos(a) * r * 1.52, Math.sin(a) * r * 1.52); ctx.stroke();
    }
    ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff1a8"; ctx.beginPath(); ctx.arc(-r * .25, -r * .25, r * .35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTree(x, y, s, pine) {
    ctx.fillStyle = "#8a5a3c";
    ctx.fillRect(x - s * .1, y - s * .42, s * .2, s * .44);
    if (pine) {
      ctx.fillStyle = "#4fa85b";
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.25); ctx.lineTo(x + s * .44, y - s * .34); ctx.lineTo(x - s * .44, y - s * .34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#62bd6c";
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.32); ctx.lineTo(x + s * .34, y - s * .66); ctx.lineTo(x - s * .34, y - s * .66); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "#5fb865";
      ctx.beginPath(); ctx.arc(x, y - s * .72, s * .42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7ed47b";
      ctx.beginPath(); ctx.arc(x - s * .14, y - s * .84, s * .25, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawWindmill(x, y, s) {
    ctx.save();
    ctx.fillStyle = "#f7efe0"; ctx.strokeStyle = "#cfc1a6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - s * .24, y); ctx.lineTo(x - s * .12, y - s * .78);
    ctx.lineTo(x + s * .12, y - s * .78); ctx.lineTo(x + s * .24, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#c99a5e"; ctx.beginPath(); ctx.arc(x, y - s * .14, s * .09, Math.PI, 0); ctx.lineTo(x + s * .09, y); ctx.lineTo(x - s * .09, y); ctx.fill();
    ctx.translate(x, y - s * .72);
    ctx.rotate(still ? .4 : clock * 1.1 + millBoost * 6);
    ctx.fillStyle = "#fffdf6"; ctx.strokeStyle = "#b8aa92"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-s * .05, 0, s * .1, s * .46); ctx.strokeRect(-s * .05, 0, s * .1, s * .46);
    }
    ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(0, 0, s * .08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawStationHouse(x, y, s, scene) {
    if (scene === "by") {
      // Hyggelig lille farverig byrække bag sporet
      const huse = [
        [-1.35, .52, .72, "#ffb4a2", "#d9534f", true],
        [-.78, .44, 1.0, "#a9d6f5", "#4f7fb4", false],
        [-.28, .42, 1.18, "#fff1d6", "#7b5ea7", true],
        [.22, .56, .68, "#ffe08a", "#e0a030", true],
        [.86, .48, .92, "#c8b6f0", "#6e58a8", false]
      ];
      huse.forEach(([ox, bw, bh, col, roof, pitched]) => {
        const bx = x + ox * s, w = bw * s, h = bh * s;
        ctx.fillStyle = col; ctx.fillRect(bx, y - h, w, h);
        ctx.fillStyle = roof;
        if (pitched) {
          ctx.beginPath(); ctx.moveTo(bx - w * .08, y - h); ctx.lineTo(bx + w * .5, y - h - w * .42); ctx.lineTo(bx + w * 1.08, y - h); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(bx - w * .04, y - h - h * .06, w * 1.08, h * .07);
        }
        ctx.fillStyle = "#fff3b0";
        const cols = bw > .5 ? 3 : 2, rows = bh > .9 ? 3 : 2;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          ctx.fillRect(bx + w * (.14 + c * (.74 / cols)), y - h * (.84 - r * .22), w * .18, h * .12);
        }
        ctx.fillStyle = "#8a5a3c"; ctx.fillRect(bx + w * .38, y - h * .24, w * .24, h * .24);
      });
      return;
    }
    // Lille hyggeligt stationshus (eng eller skov)
    const w = s * 1.35, h = s * .74;
    ctx.fillStyle = scene === "skov" ? "#c98b59" : "#fff5e1";
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = scene === "skov" ? "#4a7c59" : "#e05a4f";
    ctx.beginPath(); ctx.moveTo(x - w * .58, y - h); ctx.lineTo(x, y - h * 1.48); ctx.lineTo(x + w * .58, y - h); ctx.closePath(); ctx.fill();
    // Vinduer og dør
    ctx.fillStyle = "#cfe9ff";
    ctx.fillRect(x - w * .38, y - h * .68, w * .2, h * .28);
    ctx.fillRect(x + w * .18, y - h * .68, w * .2, h * .28);
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(x - w * .1, y - h * .46, w * .2, h * .46);
    // Stationsur i gavlen
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2f4a6d"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y - h * 1.02, s * .11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - h * 1.02); ctx.lineTo(x, y - h * 1.09);
    ctx.moveTo(x, y - h * 1.02); ctx.lineTo(x + s * .06, y - h * 1.02); ctx.stroke();
  }

  function drawBridge(cx, trackY, span) {
    // Flod under broen (skærer rent gennem græsset ved broens verdens-koordinater)
    const waterY = trackY;
    const wg = ctx.createLinearGradient(0, waterY, 0, H);
    wg.addColorStop(0, "#4ea8e8"); wg.addColorStop(1, "#2a7ec2");
    ctx.fillStyle = wg; ctx.fillRect(cx - span * .52, waterY, span * 1.04, H - waterY);
    // Bløde bølger + lille sejlbåd
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const wx = cx - span * .4 + (i / 5) * span * .8, wy = waterY + H * (.04 + (i % 2) * .05);
      ctx.beginPath(); ctx.moveTo(wx - 18, wy); ctx.quadraticCurveTo(wx, wy - 5, wx + 18, wy); ctx.stroke();
    }
    const bx = cx + Math.sin(clock * 1.5) * 14, by = waterY + H * .1 + Math.sin(clock * 3) * 3;
    ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.moveTo(bx - 22, by); ctx.lineTo(bx + 22, by); ctx.lineTo(bx + 14, by + 11); ctx.lineTo(bx - 14, by + 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fffdf7"; ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(bx, by - 32); ctx.lineTo(bx + 20, by - 6); ctx.closePath(); ctx.fill();
    // Træbro-buer under sporet
    ctx.fillStyle = "#a86d3d";
    ctx.fillRect(cx - span * .5, trackY + 2, span, H * .035);
    const pillars = 5;
    for (let i = 0; i <= pillars; i++) {
      const px = cx - span * .46 + (i / pillars) * span * .92;
      ctx.fillRect(px - 7, trackY + 6, 14, H * .26);
    }
    // Gelænder
    ctx.strokeStyle = "#8a5228"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(cx - span * .5, trackY - H * .035); ctx.lineTo(cx + span * .5, trackY - H * .035); ctx.stroke();
  }

  function drawTunnelMouth(x, trackY, s) {
    ctx.fillStyle = "#6c8c68";
    ctx.beginPath(); ctx.arc(x, trackY + 12, s * 1.05, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#7f8a99";
    ctx.beginPath(); ctx.arc(x, trackY + 12, s * .62, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#1c2238";
    ctx.beginPath(); ctx.arc(x, trackY + 12, s * .48, Math.PI, 0); ctx.fill();
  }

  function drawMoonAndStars(mx, my, r) {
    ctx.save();
    // Stjerner
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 137 + 41) % 97) / 97 * W;
      const sy = ((i * 73 + 19) % 53) / 100 * H;
      const tw = .45 + .55 * Math.sin(clock * 2.4 + i * 1.7);
      ctx.fillStyle = `rgba(255,250,210,${tw.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(sx, sy, (i % 3 === 0 ? 2.6 : 1.7), 0, Math.PI * 2); ctx.fill();
    }
    // Måne
    ctx.translate(mx, my);
    const g = ctx.createRadialGradient(0, 0, r * .4, 0, 0, r * 2.2);
    g.addColorStop(0, "rgba(255,248,196,.45)"); g.addColorStop(1, "rgba(255,248,196,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(sunSpin * 2);
    ctx.fillStyle = "#fff3b0"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b264d"; ctx.beginPath(); ctx.arc(r * .38, -r * .18, r * .82, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawRainbow(cx, baseY, r) {
    const cols = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"];
    const w = Math.max(8, r * .065);
    ctx.save(); ctx.globalAlpha = .78; ctx.lineWidth = w + 1;
    cols.forEach((col, i) => {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(cx, baseY, r - i * w, Math.PI, 0); ctx.stroke();
    });
    ctx.restore();
  }

  function drawBalloon(x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * .14, s * .35); ctx.lineTo(-s * .1, s * .56);
    ctx.moveTo(s * .14, s * .35); ctx.lineTo(s * .1, s * .56); ctx.stroke();
    ctx.fillStyle = "#c98b59"; ctx.fillRect(-s * .13, s * .55, s * .26, s * .18);
    ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(0, 0, s * .42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.ellipse(0, 0, s * .22, s * .42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5aa9e6"; ctx.beginPath(); ctx.ellipse(0, 0, s * .08, s * .42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawLighthouse(x, y, s) {
    ctx.save();
    ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#2f4a6d"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - s * .22, y); ctx.lineTo(x - s * .13, y - s * .95);
    ctx.lineTo(x + s * .13, y - s * .95); ctx.lineTo(x + s * .22, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Røde striber
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath(); ctx.moveTo(x - s * .19, y - s * .32); ctx.lineTo(x - s * .16, y - s * .62);
    ctx.lineTo(x + s * .16, y - s * .62); ctx.lineTo(x + s * .19, y - s * .32); ctx.closePath(); ctx.fill();
    // Lanterne
    ctx.fillStyle = "#ffd166"; ctx.fillRect(x - s * .13, y - s * 1.12, s * .26, s * .17);
    ctx.fillStyle = "#e8474f";
    ctx.beginPath(); ctx.moveTo(x - s * .17, y - s * 1.12); ctx.lineTo(x, y - s * 1.3); ctx.lineTo(x + s * .17, y - s * 1.12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawScene() {
    const ph = phPx(), trackY = H - ph - H * .056, m = Math.min(W, H);
    const wPx = camX * W;

    // Natte-intensitet beregnes rent ud fra kameraets afstand til eventuelle nat-strækninger
    let natA = 0;
    worldLegs.forEach((kind, i) => {
      if (kind !== "nat") return;
      const d = Math.abs(camX - (-(i + .5) * LEG));
      if (d < .88) natA = Math.max(natA, easeInOut(clamp((.88 - d) / .38, 0, 1)));
    });

    // Himmel (ensartet dagshimmel — aldrig pludselige farveskift ved stationer)
    const sky = ctx.createLinearGradient(0, 0, 0, trackY);
    sky.addColorStop(0, "#8ecbf5"); sky.addColorStop(1, "#dff6ea");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Sol
    if (natA < 1) {
      ctx.save(); ctx.globalAlpha = 1 - natA;
      drawSun(W * .88, Math.max(58, H * .13), m * .052);
      ctx.restore();
    }

    // Nattehimmel + måne + stjerner (toner blødt ind i takt med camX)
    if (natA > 0) {
      ctx.save(); ctx.globalAlpha = natA;
      const nSky = ctx.createLinearGradient(0, 0, 0, trackY);
      nSky.addColorStop(0, "#151d3b"); nSky.addColorStop(1, "#2f3f75");
      ctx.fillStyle = nSky; ctx.fillRect(0, 0, W, H);
      drawMoonAndStars(W * .86, Math.max(58, H * .14), m * .054);
      ctx.restore();
    }

    // Regnbuer i verden (faste verdens-koordinater, glider naturligt ind og ud!)
    worldLegs.forEach((kind, i) => {
      if (kind !== "regnbue") return;
      const rx = toX(-(i + .5) * LEG);
      if (Math.abs(rx - W * .5) < W * 1.4) {
        drawRainbow(rx, trackY - H * .02, Math.min(W * .44, H * .52));
      }
    });

    // Skyer
    if (natA < .95) {
      ctx.save(); ctx.globalAlpha = 1 - natA * .8;
      clouds.forEach(cl => drawCloud(cl.x * W, cl.y * H, m * .085 * cl.s));
      ctx.restore();
    }

    // Regndråber fra skyer
    drops.forEach(d => {
      ctx.fillStyle = `rgba(77,166,255,${clamp(d.life, 0, 1)})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    });

    // Fjerne bakker (kontinuerlig parallax fra camX)
    const drawHillLayer = (baseY, amp, period, parallax, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      const off = wPx * parallax;
      for (let x = 0; x <= W + 24; x += 24) {
        const y = baseY - Math.abs(Math.sin((x + off) / period)) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    drawHillLayer(trackY - H * .06, H * .16, Math.max(240, W * .34), .16, "#a6db93");
    drawHillLayer(trackY - H * .01, H * .11, Math.max(190, W * .25), .36, "#86cb76");

    // Baggrundstræer i faste verdens-koordinater (flytter sig kun med camX, skifter aldrig type pludseligt)
    const treeStep = .24; // skærmbredder mellem træer
    const iMin = Math.floor((camX - 1.2) / treeStep);
    const iMax = Math.ceil((camX + 1.2) / treeStep);
    for (let idxT = iMin; idxT <= iMax; idxT++) {
      const wx = idxT * treeStep + Math.sin(idxT * 12.7) * treeStep * .28;
      // Hold fri omkring stationer og bro/strand/tunnel
      let fri = true;
      let skovNaer = false;
      for (let k = 0; k < STATIONER; k++) {
        const stX = -k * LEG;
        const dist = Math.abs(wx - stX);
        if (dist < .46) { fri = false; break; }
        if (SCENER[k % SCENER.length] === "skov" && dist < 1.15) skovNaer = true;
      }
      if (!fri) continue;
      for (let i = 0; i < worldLegs.length; i++) {
        const kind = worldLegs[i], mid = -(i + .5) * LEG;
        if ((kind === "strand" || kind === "bro" || kind === "tunnel") && Math.abs(wx - mid) < .62) { fri = false; break; }
        if (kind === "bakker" && Math.abs(wx - (mid + .12)) < .16) { fri = false; break; }
      }
      if (!fri) continue;
      const pine = skovNaer || (Math.abs(idxT) % 3 === 0);
      const ts = m * (.085 + (Math.abs(idxT * 7) % 4) * .014);
      drawTree(toX(wx), trackY - H * .03, ts, pine);
    }

    // Alle stationer renderes i faste verdens-koordinater (by, eng, skov ruller naturligt ind fra venstre!)
    for (let k = 0; k < STATIONER; k++) {
      const stX = -k * LEG, sx = toX(stX);
      if (Math.abs(sx - W * .5) > W * 1.45) continue;
      const stSc = SCENER[k % SCENER.length];
      if (stSc === "eng") drawWindmill(toX(stX - .38), trackY - H * .05, m * .18);
      drawStationHouse(sx, trackY - H * .005, m * .22, stSc);
    }

    // Alle rejse-landemærker mellem stationerne (i faste verdens-koordinater!)
    worldLegs.forEach((kind, i) => {
      const mid = -(i + .5) * LEG, cx = toX(mid);
      if (Math.abs(cx - W * .5) > W * 1.55) return;
      if (kind === "tunnel") {
        const x1 = toX(mid + .42), x2 = toX(mid - .42), s = m * .28;
        // Tunnel-bjerg mellem de to indgange
        ctx.fillStyle = "#6c8c68";
        ctx.beginPath();
        ctx.moveTo(x2 - s * 1.05, trackY + 12);
        ctx.quadraticCurveTo(cx, trackY - s * 1.45, x1 + s * 1.05, trackY + 12);
        ctx.closePath(); ctx.fill();
        drawTunnelMouth(x1, trackY, s);
        drawTunnelMouth(x2, trackY, s);
      } else if (kind === "bakker") {
        drawWindmill(toX(mid + .12), trackY - H * .04, m * .21);
        drawStationHouse(toX(mid - .32), trackY - H * .005, m * .2, "eng");
        drawBalloon(toX(mid - .05), H * .22 + Math.sin(clock * 2.2) * 10, m * .12);
      } else if (kind === "nat") {
        ctx.save(); ctx.globalAlpha = natA;
        for (let j = 0; j < 8; j++) {
          const fx = toX(mid - .6 + j * .17);
          const fy = trackY - H * (.08 + (j % 4) * .06) + Math.sin(clock * 3 + j) * 8;
          ctx.fillStyle = "rgba(255,244,150,.85)";
          ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      } else if (kind === "regnbue") {
        const fCols = ["#ff6b6b", "#ffd166", "#ff8fb1", "#9775fa", "#5aa9e6"];
        for (let j = 0; j < 12; j++) {
          const fx = toX(mid - .6 + j * .11);
          const fy = trackY - H * .018;
          ctx.fillStyle = fCols[j % fCols.length];
          ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fffdf7";
          ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (kind === "strand") {
        const span = W * 1.15, seaY = trackY - H * .14;
        const left = cx - span * .5, right = cx + span * .5;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(left, trackY);
        ctx.quadraticCurveTo(left + span * .12, seaY, left + span * .25, seaY);
        ctx.lineTo(right - span * .25, seaY);
        ctx.quadraticCurveTo(right - span * .12, seaY, right, trackY);
        ctx.closePath();
        const sg = ctx.createLinearGradient(0, seaY, 0, trackY);
        sg.addColorStop(0, "#3ca3e0"); sg.addColorStop(1, "#5dc2f0");
        ctx.fillStyle = sg; ctx.fill();
        ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2.5;
        for (let j = 0; j < 6; j++) {
          const wx = left + span * (.15 + j * .14), wy = seaY + H * (.035 + (j % 2) * .045);
          ctx.beginPath(); ctx.moveTo(wx - 22, wy); ctx.quadraticCurveTo(wx, wy - 5, wx + 22, wy); ctx.stroke();
        }
        ctx.restore();
        drawLighthouse(cx - span * .34, trackY - H * .01, m * .22);
        const sx = cx + span * .12 + Math.sin(clock * 1.4) * 14;
        const sy = trackY - H * .06 + Math.sin(clock * 3) * 3;
        ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.moveTo(sx - 20, sy); ctx.lineTo(sx + 20, sy); ctx.lineTo(sx + 13, sy + 10); ctx.lineTo(sx - 13, sy + 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fffdf7"; ctx.beginPath(); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx, sy - 28); ctx.lineTo(sx + 18, sy - 6); ctx.closePath(); ctx.fill();
      }
    });

    // Græsbredde under sporet (kontinuerlig — strand-sand og flod/bro tegnes ovenpå ved deres verdens-koordinater)
    ctx.fillStyle = "#6db862";
    ctx.fillRect(0, trackY, W, H - trackY);
    worldLegs.forEach((kind, i) => {
      const mid = -(i + .5) * LEG, cx = toX(mid);
      if (Math.abs(cx - W * .5) > W * 1.55) return;
      if (kind === "strand") {
        const span = W * 1.15;
        ctx.fillStyle = "#f2d69b";
        ctx.fillRect(cx - span * .45, trackY, span * .9, H - trackY);
      } else if (kind === "bro") {
        drawBridge(cx, trackY, W * .95);
      }
    });
    if (natA > 0) {
      ctx.fillStyle = `rgba(14,22,52,${(natA * .42).toFixed(2)})`;
      ctx.fillRect(0, trackY, W, H - trackY);
    }

    // Spor (sveller låst 1:1 til camX + skinne)
    ctx.fillStyle = "#8a6a4a";
    const tieStep = 26, tieOff = mod(-wPx, tieStep);
    for (let x = tieOff - tieStep; x < W + tieStep; x += tieStep) {
      ctx.fillRect(x, trackY + 2, 11, 12);
    }
    ctx.fillStyle = "#c8d2de"; ctx.fillRect(0, trackY, W, 4);
    ctx.fillStyle = "#7a8696"; ctx.fillRect(0, trackY + 4, W, 2.5);

    // Gnister/glimt ved tryk
    sparks.forEach(s => {
      ctx.fillStyle = s.col; ctx.globalAlpha = clamp(s.life, 0, 1);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- Animation ---------- */
  function frame(t) {
    if (!alive) return;
    if (!lastT) lastT = t;
    const dt = Math.min(.05, (t - lastT) / 1000);
    lastT = t;
    update(dt);
    drawScene();
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    clock += dt;
    sunSpin = Math.max(0, sunSpin - dt * 1.4);
    millBoost = Math.max(0, millBoost - dt * .5);
    turbo = Math.max(0, turbo - dt);

    let dx = 0;
    if (tween) {
      const x0 = trainX;
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      trainX = tween.from + (tween.to - tween.from) * tween.ease(tween.t);
      dx = trainX - x0;
      if (tween.t >= 1) { const d = tween.done; tween = null; d && d(); }
    } else if (phase === "ride") {
      rideT += dt * (turbo > 0 ? 1.45 : 1);
      const p = clamp(rideT / rideDur, 0, 1);
      const prevCam = camX;
      camX = rideFrom + (rideTo - rideFrom) * easeInOut(p);
      dx = (camX - prevCam) * W;
      chugAcc += Math.abs(dx);
      if (chugAcc > 110) { chugAcc = 0; chugLyd(); if (!still) damp(1); }
      // Tunnel-mørke og nat-forlygte styres direkte af kameraets position i verden
      const iTunnel = worldLegs.some((k, i) => k === "tunnel" && Math.abs(camX - (-(i + .5) * LEG)) < .38);
      const iNat = worldLegs.some((k, i) => k === "nat" && Math.abs(camX - (-(i + .5) * LEG)) < .68);
      el.tg.classList.toggle("i-tunnel", iTunnel);
      el.tg.classList.toggle("i-nat", iNat);
      if (rideT >= rideDur) {
        camX = rideTo;
        el.tg.classList.remove("i-tunnel", "i-nat", "koerer");
        station++;
        if (station >= STATIONER) { fest(); }
        else { nyStation(true); }
      }
    }

    const v = dt > 0 ? Math.abs(dx) / dt : 0;
    const bob = (!still && v > 20) ? Math.sin(clock * 12) * Math.min(2, v / 220) : 0;
    el.train.style.transform = `translate3d(${trainX.toFixed(1)}px,${bob.toFixed(1)}px,0)`;
    if (!still) hjul = mod(hjul + dx * 1.45, 360);
    el.wheels.forEach(w => w.style.setProperty("--spin", hjul.toFixed(1) + "deg"));
    const sr = hjul * Math.PI / 180, rr = el.loco.clientWidth * .028;
    el.rod.style.transform = `translate(${(Math.sin(sr) * rr).toFixed(1)}px,${(-Math.cos(sr) * rr).toFixed(1)}px)`;

    clouds.forEach(cl => {
      if (!still) cl.x += (cl.v + (phase === "ride" ? .025 : 0)) * dt;
      if (cl.x > 1.15) cl.x = -.15;
    });
    drops.forEach(d => { d.y += H * .38 * dt; d.life -= dt * 1.2; });
    drops = drops.filter(d => d.life > 0);
    sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.8; });
    sparks = sparks.filter(s => s.life > 0);
  }

  /* ---------- Lyd og damp ---------- */
  function tut(lang) {
    Spil.tone([560, 840], .16, "square");
    if (lang) later(() => Spil.tone([560, 840], .26, "square"), 380);
    damp(lang ? 5 : 3);
    el.loco.classList.remove("hop"); void el.loco.offsetWidth; el.loco.classList.add("hop");
  }
  function chugLyd() {
    try {
      const a = Spil.audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(60, t + .06);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + .08);
    } catch (e) {}
  }
  function damp(n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "tg-steam";
      s.style.animationDelay = (i * .07) + "s";
      s.style.setProperty("--dx", (12 + Math.random() * 28).toFixed(0) + "px");
      s.style.setProperty("--sc", (1.4 + Math.random() * .9).toFixed(2));
      el.loco.appendChild(s);
      later(() => s.remove(), 1400 + i * 80);
    }
  }

  /* ---------- Interaktion med landskabet og vognene ---------- */
  function trykLandskab(e) {
    if (!alive) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, m = Math.min(W, H);
    // Solen eller månen
    if (Math.hypot(x - W * .88, y - Math.max(58, H * .13)) < m * .1) {
      sunSpin = 1; Spil.tone([880, 1180], .12, "sine");
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        sparks.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, r: 4 + Math.random() * 4, col: "#ffd23f", life: 1 });
      }
      return;
    }
    // Regnbue-gnister ved tryk på himlen nær en regnbue
    if (y < H * .55 && worldLegs.some((k, i) => k === "regnbue" && Math.abs(camX - (-(i + .5) * LEG)) < .8)) {
      const cols = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"];
      Spil.tone([523, 659, 784], .08, "sine");
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        sparks.push({ x, y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, r: 4 + Math.random() * 4, col: cols[i % cols.length], life: 1 });
      }
      return;
    }
    // Skyer → regndråber
    for (const cl of clouds) {
      if (Math.hypot(x - cl.x * W, y - cl.y * H) < m * .09 * cl.s) {
        Spil.tone([700, 520], .1, "sine");
        for (let i = 0; i < 6; i++) {
          drops.push({ x: cl.x * W + (Math.random() - .5) * m * .1, y: cl.y * H + m * .02 + Math.random() * 14, life: 1 });
        }
        return;
      }
    }
    // Vindmøller i verden (både ved eng-stationer og på bakke-strækninger)
    const trackY = H - phPx() - H * .056;
    const millXs = [];
    for (let k = 0; k < STATIONER; k++) if (SCENER[k % SCENER.length] === "eng") millXs.push(toX(-k * LEG - .38));
    worldLegs.forEach((k, i) => { if (k === "bakker") millXs.push(toX(-(i + .5) * LEG + .12)); });
    if (millXs.some(mx => Math.hypot(x - mx, y - (trackY - H * .12)) < m * .14)) {
      millBoost = 2.4; Spil.tone([320, 420, 520], .08, "triangle");
    }
  }

  function trykVogn(car) {
    if (!alive || !car._a) return;
    const a = car._a;
    car.classList.remove("pop"); void car.offsetWidth; car.classList.add("pop");
    Spil.burstAt(car, "⭐✨🎵");
    if (!Spil.isTalking()) Spil.say(a[1], null, "dyr-" + a[0]);
    else Spil.sfx.pop();
  }

  /* ---------- Stationer ---------- */
  function tomVogne() {
    el.carEls.forEach(c => { c.classList.remove("full", "pop"); c._a = null; c.querySelector(".who").innerHTML = ""; });
  }

  function nyStation(fraRejse) {
    if (!alive) return;
    phase = "arrive"; boarded = 0;
    if (deck.length < 4) deck = Spil.shuffle(ANIMALS.slice());
    dyr = deck.splice(0, 4);
    tomVogne();
    hvilSteder();
    el.prompt.textContent = "";
    el.tg.classList.remove("koerer", "i-tunnel", "i-nat");
    if (fraRejse) {
      trainX = 0;
      byggPerron();
      phase = "choose";
      return;
    }
    trainX = W + 100;
    tween = { from: trainX, to: 0, t: 0, dur: still ? .8 : 1.9, ease: easeOut, done: () => {
      if (!alive) return;
      byggPerron();
      phase = "choose";
    } };
  }

  function hvilSteder() {
    el.spots.forEach(sp => {
      sp.classList.remove("aktiv", "vaek", "ud", "hint", "ryst", "kom");
      sp._a = null; sp.querySelector(".gz-dyr").innerHTML = "";
    });
  }

  function byggPerron() {
    hvilSteder();
    const steder = Spil.shuffle(el.spots.slice());
    dyr.forEach((a, i) => {
      const sp = steder[i];
      sp._a = a;
      const box = sp.querySelector(".gz-dyr");
      box.innerHTML = `<img src="${a[3]}" alt="${a[1]}" draggable="false">`;
      box.style.animationDelay = (-i * .6) + "s";
      sp.classList.add("aktiv");
    });
    el.spots.forEach(sp => {
      sp.classList.add("kom"); later(() => sp.classList.remove("kom"), 550);
    });
  }

  const ryst = sp => { sp.classList.remove("ryst"); void sp.offsetWidth; sp.classList.add("ryst"); };

  function setCar(car, a) {
    car._a = a || null;
    const who = car.querySelector(".who");
    if (a) {
      who.innerHTML = `<img src="${a[3]}" alt="${a[1]}" draggable="false">`;
      car.classList.add("full");
    } else {
      who.innerHTML = "";
      car.classList.remove("full", "pop");
    }
  }

  function setSpot(sp, a) {
    sp._a = a || null;
    const box = sp.querySelector(".gz-dyr");
    if (a) {
      box.innerHTML = `<img src="${a[3]}" alt="${a[1]}" draggable="false">`;
      sp.classList.remove("vaek", "ud");
      sp.classList.add("aktiv");
    } else {
      sp.classList.remove("aktiv", "ud");
      sp.classList.add("vaek");
    }
  }

  function popCar(car) {
    car.classList.remove("pop"); void car.offsetWidth; car.classList.add("pop");
    Spil.burstAt(car, "⭐✨⭐✨");
    later(() => car.classList.remove("pop"), 550);
  }

  function tjekAfgang(a) {
    if (phase === "choose" && el.carEls.every(c => c._a)) {
      phase = "departing";
      let gik = false;
      const videre = () => { if (!gik && alive) { gik = true; startRejse(); } };
      const tidligst = Date.now() + 1400;
      Spil.say("Ja! Hør, hvad " + a[1] + " siger!", () => later(videre, Math.max(350, tidligst - Date.now())), Spil.jaDyr(a[0]));
      later(videre, 4500);
    } else {
      Spil.say("Ja! Hør, hvad " + a[1] + " siger!", null, Spil.jaDyr(a[0]));
    }
  }

  function trykSted(sp) {
    if (!alive || phase !== "choose") return;
    const a = sp._a;
    if (!a || sp.classList.contains("vaek")) {
      Spil.tone([420, 330], .07, "sine"); ryst(sp);
      return;
    }
    const car = el.carEls.find(c => !c._a);
    if (car) ombord(sp, car, a);
  }

  function ombord(sp, car, a) {
    sp.classList.remove("ud"); sp.classList.add("vaek"); ryst(sp);
    car._a = a; // reservér vognen straks så hurtige tryk rammer næste vogn
    Spil.sfx.right();
    hopInd(sp.querySelector(".gz-dyr"), car, a, () => {
      if (!alive) return;
      setCar(car, a);
      popCar(car);
    });
    tjekAfgang(a);
  }

  /* ---------- Træk og slip dyr mellem perron og vogne ---------- */
  let drag = null;

  function findDropTarget(cx, cy) {
    const pad = 16;
    const hit = el => {
      const r = el.getBoundingClientRect();
      return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
    };
    for (const c of el.carEls) if (hit(c)) return c;
    if (phase === "choose") {
      for (const s of el.spots) if (s !== drag.srcEl && hit(s)) return s;
    }
    return null;
  }

  function posDragGhost(cx, cy) {
    if (!drag || !drag.ghost) return;
    const tgR = el.tg.getBoundingClientRect();
    drag.ghost.style.left = (cx - tgR.left).toFixed(1) + "px";
    drag.ghost.style.top = (cy - tgR.top).toFixed(1) + "px";
  }

  function endDrag() {
    if (!drag) return;
    drag.srcEl.classList.remove("dragging");
    if (drag.hover) drag.hover.classList.remove("drop-hover");
    if (drag.ghost) drag.ghost.remove();
    drag = null;
  }

  function startDrag(e, kind, srcEl) {
    if (!alive || (e.button && e.button !== 0)) return;
    if (kind === "spot") {
      if (phase !== "choose") return;
      if (!srcEl._a || srcEl.classList.contains("vaek")) { trykSted(srcEl); return; }
    } else {
      if (!srcEl._a || (phase !== "choose" && phase !== "ride")) return;
    }
    e.preventDefault();
    endDrag();
    drag = { kind, srcEl, a: srcEl._a, x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: false, ghost: null, hover: null };
  }

  function onDragMove(e) {
    if (!alive || !drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 12) return;
      drag.moved = true;
      drag.srcEl.classList.add("dragging");
      const g = document.createElement("div");
      g.className = "tg-ghost drag";
      g.innerHTML = `<img src="${drag.a[3]}" alt="" draggable="false">`;
      el.tg.appendChild(g);
      drag.ghost = g;
    }
    posDragGhost(e.clientX, e.clientY);
    const dst = findDropTarget(e.clientX, e.clientY);
    if (drag.hover && drag.hover !== dst) drag.hover.classList.remove("drop-hover");
    drag.hover = dst && dst !== drag.srcEl ? dst : null;
    if (drag.hover) drag.hover.classList.add("drop-hover");
  }

  function onDragUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    const dst = d.moved ? findDropTarget(e.clientX, e.clientY) : null;
    endDrag();
    if (!alive || e.type === "pointercancel") return;
    if (!d.moved) {
      if (d.kind === "spot") trykSted(d.srcEl);
      else trykVogn(d.srcEl);
      return;
    }
    if (!dst || dst === d.srcEl) return;
    if (dst.classList.contains("tg-car")) {
      const old = dst._a;
      if (d.kind === "spot") {
        setSpot(d.srcEl, old);
        setCar(dst, d.a);
        popCar(dst); ryst(d.srcEl);
        Spil.sfx.right();
        tjekAfgang(d.a);
      } else {
        setCar(d.srcEl, old);
        setCar(dst, d.a);
        popCar(dst); if (old) popCar(d.srcEl);
        Spil.sfx.pop();
      }
    } else if (dst.classList.contains("gz") && phase === "choose") {
      const old = dst._a && !dst.classList.contains("vaek") ? dst._a : null;
      if (d.kind === "car") setCar(d.srcEl, old);
      else { setSpot(d.srcEl, old); ryst(d.srcEl); }
      setSpot(dst, d.a); ryst(dst);
      Spil.sfx.pop();
    }
  }

  // Dyret hopper i en blød bue fra gemmestedet op i togvognens vindue
  function hopInd(fra, til, a, faerdig) {
    const g = document.createElement("div");
    g.className = "tg-ghost";
    g.innerHTML = `<img src="${a[3]}" alt="" draggable="false">`;
    const tgR = el.tg.getBoundingClientRect();
    const r0 = fra.getBoundingClientRect(), r1 = til.getBoundingClientRect();
    const x0 = r0.left + r0.width / 2 - tgR.left, y0 = r0.top + r0.height / 2 - tgR.top;
    const x1 = r1.left + r1.width / 2 - tgR.left, y1 = r1.top + r1.height * .46 - tgR.top;
    g.style.left = x0 + "px"; g.style.top = y0 + "px";
    el.tg.appendChild(g);
    const t0 = performance.now(), dur = still ? 180 : 480;
    const step = now => {
      if (!alive) { g.remove(); return; }
      const p = clamp((now - t0) / dur, 0, 1), e = easeInOut(p);
      const x = x0 + (x1 - x0) * e;
      const arc = Math.sin(p * Math.PI) * Math.min(H * .18, 120);
      const y = y0 + (y1 - y0) * e - arc;
      const sc = 1 - p * .28;
      g.style.left = x.toFixed(1) + "px"; g.style.top = y.toFixed(1) + "px";
      g.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(2)})`;
      if (p < 1) requestAnimationFrame(step);
      else { g.remove(); faerdig(); }
    };
    requestAnimationFrame(step);
  }

  /* ---------- Rejse mellem stationer & fest ---------- */
  function startRejse() {
    phase = "depart";
    el.prompt.textContent = "";
    tut(true);
    Spil.say("Alle er med! Nu kører toget!", null, "tog-klar");
    // Ved sidste station kører toget direkte til den store fest
    if (station + 1 >= STATIONER) {
      later(() => {
        el.tg.classList.add("koerer");
        tween = { from: trainX, to: -(W + el.train.offsetWidth + 120), t: 0, dur: still ? 1.0 : 2.6, ease: easeInOut,
          done: () => { if (alive) { station = STATIONER; fest(); } } };
      }, 450);
      return;
    }
    // Levende togtur gennem den sammenhængende verden til næste station!
    later(() => {
      if (!alive) return;
      rideFrom = camX;
      rideTo = -(station + 1) * LEG;
      rideT = 0; rideDur = still ? 2.4 : 7.0; turbo = 0; chugAcc = 0;
      phase = "ride";
      el.tg.classList.add("koerer");
    }, 550);
  }

  const FESTFARVER = ["#ffd6e3", "#fff0b0", "#d4f0c8", "#d6ecff"];
  const VIMPEL = ["#ff6b6b", "#ffd166", "#6cc56c", "#5aa9e6"];
  function fest() {
    phase = "party";
    el.prompt.textContent = "";
    el.tg.classList.remove("koerer", "i-tunnel", "i-nat");
    const p = document.createElement("div");
    p.className = "tg-party";
    p.innerHTML = `<div class="tg-hurra">Hurra!</div>
      <div class="tg-parade">${ANIMALS.map((a, i) =>
        `<button style="--c:${FESTFARVER[i % 4]}" data-i="${i}" aria-label="${a[1]}"><img src="${a[3]}" alt="${a[1]}" draggable="false"></button>`).join("")}</div>
      <div class="tg-vimpler">${Array.from({ length: 11 }, (_, i) =>
        `<i style="--c:${VIMPEL[i % 4]};--y:${(Math.sin(Math.PI * i / 10) * 2.2).toFixed(2)}vh"></i>`).join("")}</div>`;
    p.onclick = e => {
      const b = e.target.closest("button[data-i]");
      if (b) {
        const a = ANIMALS[+b.dataset.i];
        Spil.burstAt(b, "🎉✨⭐");
        Spil.say(a[1], null, "dyr-" + a[0]);
      } else {
        Spil.sfx.pop(); Spil.burst(e.clientX, e.clientY, "🎉✨⭐🎈");
      }
    };
    el.tg.appendChild(p);
    Spil.sfx.fanfare();
    Spil.say("Hurra! Alle dyrene er med toget!", null, "tog-hurra");
    const regn = () => {
      if (!alive || phase !== "party") return;
      Spil.burst(W * (.15 + Math.random() * .7), H * (.15 + Math.random() * .3), "🎉✨⭐🎈🌟");
      later(regn, 1100);
    };
    regn();
    later(() => { if (!alive) return; p.remove(); station = 0; camX = 0; byggVerden(); nyStation(false); }, 9500);
  }

  /* ---------- Dybe links (til test) ----------
     perron            toget holder allerede ved perronen, og stemmen spørger med det samme
     afgang / tur      vognene er fulde, og toget kører af sted gennem landskabet
     by                toget holder ved stationen i byen
     fest              festen til sidst */
  function dybStart(d) {
    if (d === "perron") { nyStation(true); return true; }
    if (d === "by") { station = 1; camX = -LEG; nyStation(true); return true; }
    if (d === "afgang" || d === "tur") {
      trainX = 0;
      dyr = deck.splice(0, 3);
      el.carEls.forEach((c, i) => {
        c._a = dyr[i];
        c.querySelector(".who").innerHTML = `<img src="${dyr[i][3]}" alt="${dyr[i][1]}" draggable="false">`;
        c.classList.add("full");
      });
      boarded = 3;
      later(startRejse, 250);
      return true;
    }
    if (d === "fest") { station = STATIONER; later(fest, 200); return true; }
    return false;
  }

  /* ---------- Start og stop ---------- */
  Spil.register({
    id: "toget", navn: "Toget", ikon: "🚂", farve: "#a9c6f2",
    start(r) {
      root = r; alive = true; timers = []; clock = 0; hjul = 0; trainX = 0; camX = 0;
      turbo = 0; chugAcc = 0; tween = null; phase = ""; boarded = 0;
      station = 0; lastT = 0; sunSpin = 0; millBoost = 0; drops = []; sparks = [];
      deck = Spil.shuffle(ANIMALS.slice()); dyr = []; byggVerden();
      Spil.preload(ANIMALS.flatMap(a => ["ja-" + a[0], "dyr-" + a[0]])
        .concat(["tog-hej", "tog-klar", "tog-hurra"]));
      bygg();
      addEventListener("resize", resize);
      addEventListener("pointermove", onDragMove);
      addEventListener("pointerup", onDragUp);
      addEventListener("pointercancel", onDragUp);
      resize();
      trainX = W + 100;
      raf = requestAnimationFrame(frame);
      if (dybStart(Spil.dyb || "")) return;
      later(() => Spil.say("Hej! Hjælp dyrene med at komme med toget!", null, "tog-hej"), 300);
      later(() => nyStation(false), 1800);
    },
    stop() {
      alive = false;
      endDrag();
      timers.forEach(clearTimeout); timers = [];
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onDragMove);
      removeEventListener("pointerup", onDragUp);
      removeEventListener("pointercancel", onDragUp);
    }
  });
})();
