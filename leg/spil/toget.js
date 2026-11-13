// Spil: Toget — et farverigt tog kører gennem et blødt landskab (eng, bro, tunnel, by).
// Toget ruller ind på en station, og barnet hjælper tre dyr ombord ved at trykke på det dyr,
// stemmen beder om. Tryk på lokomotivet giver "tut-tut", damp og et lille hop. Ingen tabe-tilstand.
(function () {
  // dyr: emoji, bestemt form, lydnøgle (find-/er-/ja-/dyr-), ubestemt form (til reservestemmen)
  const ANIMALS = [
    ["🐄", "koen", "ko", "en ko"],
    ["🐈", "katten", "kat", "en kat"],
    ["🐕", "hunden", "hund", "en hund"],
    ["🐖", "grisen", "gris", "en gris"],
    ["🦆", "anden", "and", "en and"],
    ["🐑", "fåret", "faar", "et får"],
    ["🐎", "hesten", "hest", "en hest"],
    ["🐘", "elefanten", "elefant", "en elefant"],
    ["🐒", "aben", "abe", "en abe"],
    ["🦉", "uglen", "ugle", "en ugle"],
    ["🐔", "hønen", "hoene", "en høne"],
    ["🐸", "frøen", "froe", "en frø"]
  ];
  const CARS = ["#ff8fb1", "#ffd166", "#8bd17c"]; // hver vogn sin glade farve
  // Gemmesteder: [dække, plads]. Tre af dem bruges ved hver station
  const SPOTS = [["🧳", "s1"], ["🛒", "s2"], ["🧺", "s3"], ["🌳", "s4"], ["🌲", "s5"]];
  const STATIONER = 4;
  const LAND = ["tunnel", "bro", "by"];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mod = (a, b) => ((a % b) + b) % b;
  const easeIn = t => t * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  Spil.css("css-toget", `
    .tg{position:absolute;inset:0;overflow:hidden;--ph:26vh;
      --lw:clamp(96px,22vmin,210px);--cw:clamp(74px,17vmin,165px);--gs:clamp(110px,min(21vmin,26vh),190px);
      background:linear-gradient(#9fd8f5 0%,#c8ecff 42%,#e8f8dd 64%,#bfe6ab 100%);
      color:var(--ink);touch-action:manipulation}
    @media (max-aspect-ratio:1/1){.tg{--ph:22vh;--lw:clamp(100px,26vmin,150px);--cw:clamp(78px,20vmin,120px);--gs:clamp(92px,27vmin,132px)}}
    @media (max-height:560px){.tg{--ph:17vh;--lw:clamp(84px,15vmin,132px);--cw:clamp(62px,11vmin,104px);--gs:clamp(78px,17vh,120px)}}

    /* ---------- Landskab ---------- */
    .tg-hills{position:absolute;left:0;right:0;background-repeat:repeat-x;pointer-events:none;z-index:1}
    .tg-hills.far{bottom:calc(var(--ph) + 9vh);height:30vh;
      background-image:radial-gradient(ellipse 62% 100% at 50% 100%,#a9dd93 0 99%,rgba(169,221,147,0) 100%);
      background-size:36vw 100%}
    .tg-hills.near{bottom:calc(var(--ph) + 5vh);height:24vh;z-index:2;
      background-image:radial-gradient(ellipse 58% 100% at 50% 100%,#8ccf78 0 99%,rgba(140,207,120,0) 100%);
      background-size:27vw 100%}
    /* På højkant: bredere bakker, så de ikke bliver til spidse kegler */
    @media (max-aspect-ratio:1/1){.tg-hills.far{background-size:86vw 100%}.tg-hills.near{background-size:62vw 100%}}
    .tg-trees{position:absolute;left:0;right:0;bottom:calc(var(--ph) + 4.6vh);height:0;
      font-size:calc(var(--lw)*.34);z-index:3;pointer-events:none}
    .tg-trees.fjern{bottom:calc(var(--ph) + 14vh);font-size:calc(var(--lw)*.21);z-index:2;opacity:.85}
    .tg-flowers{position:absolute;left:0;right:0;bottom:calc(var(--ph) + .8vh);height:0;
      font-size:calc(var(--lw)*.14);z-index:6;pointer-events:none}
    .tg-sprite{position:absolute;left:0;bottom:0;line-height:1}
    .tg-track{position:absolute;left:0;right:0;bottom:calc(var(--ph) + 5vh);height:1.8vh;z-index:4;
      background:repeating-linear-gradient(90deg,#8a6a4a 0 1.1vh,#b98d61 1.1vh 2.6vh);
      box-shadow:inset 0 .5vh 0 rgba(255,255,255,.45),inset 0 -.4vh 0 rgba(0,0,0,.15)}

    /* ---------- Sol, skyer, vindmølle, traktor (klassen hedder stadig tg-cow) ---------- */
    .tg-sun{position:absolute;top:calc(3vh + env(safe-area-inset-top,0px));right:max(3vw,14px);z-index:2;
      width:clamp(64px,11vmin,116px);aspect-ratio:1;border-radius:50%;font-size:clamp(48px,9vmin,96px);
      display:grid;place-items:center;background:radial-gradient(circle,#ffe89a 30%,rgba(255,232,154,0) 72%);padding:0}
    .tg-sun.sjov{animation:tg-sun .8s ease-out}
    @keyframes tg-sun{40%{transform:rotate(24deg) scale(1.25)}70%{transform:rotate(-12deg) scale(1.1)}}
    .tg-cloud{position:absolute;left:0;z-index:2;width:clamp(64px,13vmin,132px);aspect-ratio:1;
      font-size:clamp(42px,10.4vmin,106px);display:grid;place-items:center;background:none;padding:0;
      filter:drop-shadow(0 4px 6px rgba(31,58,95,.12))}
    .tg-cloud.c1{top:calc(22vh + env(safe-area-inset-top,0px))}
    .tg-cloud.c2{top:calc(29vh + env(safe-area-inset-top,0px));left:0}
    .tg-cloud.c3{top:calc(36vh + env(safe-area-inset-top,0px));left:0}
    .tg-drop{position:absolute;font-size:clamp(14px,2.6vh,24px);pointer-events:none;z-index:4;
      animation:tg-fall .9s ease-in forwards}
    @keyframes tg-fall{to{transform:translateY(22vh) rotate(30deg);opacity:0}}
    .tg-mill{position:absolute;left:5vw;bottom:calc(var(--ph) + 15vh);z-index:3;padding:0;background:none;
      width:calc(var(--lw)*.66);min-width:64px;height:calc(var(--lw)*.74);min-height:64px}
    .tg-tower{position:absolute;left:33%;bottom:0;width:34%;height:58%;
      background:linear-gradient(#fffaf0,#e7dcc6);clip-path:polygon(26% 0,74% 0,100% 100%,0 100%);
      box-shadow:inset 0 0 0 2px rgba(31,58,95,.12)}
    .tg-tower::after{content:"";position:absolute;left:38%;bottom:0;width:24%;height:32%;
      background:#c99a5e;border-radius:40% 40% 0 0}
    .tg-blades{position:absolute;left:50%;top:36%;width:64%;aspect-ratio:1;transform:translate(-50%,-50%);
      animation:tg-spin 16s linear infinite}
    .tg-blades i{position:absolute;left:50%;top:50%;width:12%;height:48%;transform-origin:50% 0;
      background:#fffdf6;border-radius:2px;box-shadow:0 0 0 1px #cfc4ad,inset 0 -3px 0 rgba(0,0,0,.06)}
    .tg-blades i:nth-child(1){transform:translateX(-50%) rotate(0deg)}
    .tg-blades i:nth-child(2){transform:translateX(-50%) rotate(90deg)}
    .tg-blades i:nth-child(3){transform:translateX(-50%) rotate(180deg)}
    .tg-blades i:nth-child(4){transform:translateX(-50%) rotate(270deg)}
    .tg-blades::after{content:"";position:absolute;left:50%;top:50%;width:20%;aspect-ratio:1;
      transform:translate(-50%,-50%);border-radius:50%;background:#ff6b6b;box-shadow:0 0 0 2px #d94b4b}
    .tg-mill.snur .tg-blades{animation-duration:.6s}
    @keyframes tg-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
    .tg-cow{position:absolute;right:6vw;bottom:calc(var(--ph) + 13vh);z-index:3;padding:0;background:none;
      width:clamp(64px,12vmin,124px);aspect-ratio:1;font-size:clamp(46px,9.6vmin,100px);display:grid;place-items:center;
      filter:drop-shadow(0 4px 4px rgba(31,58,95,.15))}
    .tg-cow.hop{animation:tg-cowhop .5s ease-out}
    @keyframes tg-cowhop{35%{transform:translateY(-18%) rotate(-6deg)}70%{transform:translateY(0)}}

    /* ---------- Toget ---------- */
    .tg-train{position:absolute;left:0;right:0;bottom:calc(var(--ph) + 5.6vh);display:flex;justify-content:center;
      align-items:flex-end;gap:.9vh;z-index:5;will-change:transform;pointer-events:none}
    .tg-train>*{pointer-events:auto}
    .tg-loco{position:relative;flex:0 0 auto;width:var(--lw);height:calc(var(--lw)*.8);
      font-size:calc(var(--lw)*.1);background:none;padding:0;border:0}
    .tg-loco.hop{animation:tg-hop .42s ease-out}
    @keyframes tg-hop{30%{transform:translateY(-9%)}60%{transform:translateY(0)}80%{transform:translateY(-3%)}}
    .tg-loco .boiler{position:absolute;left:1%;bottom:20%;width:62%;height:45%;z-index:1;
      border-radius:48% 12% 10% 48%/50% 12% 10% 50%;
      background:linear-gradient(#ff9b9b,#ff6b6b 45%,#e04b4b);box-shadow:inset 0 .5em 0 rgba(255,255,255,.35),0 3px 0 rgba(31,58,95,.18)}
    .tg-loco .cab{position:absolute;right:1%;bottom:20%;width:40%;height:64%;z-index:1;
      border-radius:16% 20% 8% 8%/14% 18% 8% 8%;
      background:linear-gradient(#ff8f8f,#e8474f);box-shadow:inset 0 .5em 0 rgba(255,255,255,.28),0 3px 0 rgba(31,58,95,.18)}
    .tg-loco .window{position:absolute;right:12%;bottom:48%;width:18%;height:24%;border-radius:14%;
      background:#d6ecff;box-shadow:inset 0 0 0 .25em #2f4a6d;z-index:2}
    .tg-loco .roof{position:absolute;right:0;bottom:82%;width:44%;height:10%;border-radius:999px;background:#2f4a6d;z-index:2}
    .tg-loco .chimney{position:absolute;left:12%;bottom:62%;width:11%;height:24%;background:#2f4a6d;z-index:2;border-radius:.2em .2em 0 0}
    .tg-loco .chimney::after{content:"";position:absolute;left:-32%;right:-32%;top:-16%;height:30%;background:#3d5c85;border-radius:.15em}
    .tg-loco .lamp{position:absolute;left:0;bottom:46%;width:12%;aspect-ratio:1;border-radius:50%;z-index:3;
      background:radial-gradient(circle at 40% 35%,#fffce0,#ffd166);box-shadow:0 0 1.4em #ffe89a}
    .tg-loco .eye{position:absolute;bottom:42%;width:14%;aspect-ratio:1;border-radius:50%;background:#fff;z-index:3;
      box-shadow:inset 0 0 0 .2em #2f4a6d}
    .tg-loco .eye::after{content:"";position:absolute;left:24%;top:28%;width:44%;height:44%;border-radius:50%;background:#1f3a5f}
    .tg-loco .e1{left:20%}.tg-loco .e2{left:38%}
    .tg-loco .mouth{position:absolute;left:21%;bottom:30%;width:18%;height:9%;z-index:3;
      border-bottom:.5em solid #a83c3c;border-radius:0 0 60% 60%}
    /* Hjul: mørkt dæk, lys fælg, tynde eger der drejer med farten, gul nav */
    .wheel{position:absolute;bottom:-2%;aspect-ratio:1;border-radius:50%;z-index:0;
      background:
        radial-gradient(circle,#ffd166 0 15%,#c99a2e 16% 21%,transparent 22%),
        repeating-conic-gradient(from var(--spin,0deg),#3a5273 0 11deg,transparent 11deg 60deg),
        radial-gradient(circle,#eaf1f8 0 63%,#2b3a52 64% 100%);
      box-shadow:0 .3vh 0 rgba(0,0,0,.22)}
    .tg-loco .w1{left:2%;width:24%}.tg-loco .w2{left:31%;width:24%}.tg-loco .w3{left:60%;width:24%}
    /* Kobberstangen mellem lokomotivets hjul (flyttes i en lille cirkel af animationsløkken) */
    .tg-loco .rod{position:absolute;left:14%;width:58%;bottom:13%;height:4.6%;z-index:3;border-radius:999px;
      background:linear-gradient(#ff8f8f,#d94b4b);box-shadow:0 .2vh 0 rgba(0,0,0,.2)}
    .tg-cars{position:relative;display:flex;align-items:flex-end;gap:.9vh;flex:0 0 auto}
    .tg-car{position:relative;flex:0 0 auto;width:var(--cw);height:calc(var(--cw)*.8);border-radius:14% 14% 8% 8%;
      background:var(--c);box-shadow:inset 0 -.9vh 0 rgba(0,0,0,.12),0 3px 0 rgba(31,58,95,.18)}
    /* koblinger: mellem vognene og fra lokomotivet til første vogn */
    .tg-car::before{content:"";position:absolute;left:-1.1vh;top:62%;width:1.3vh;height:.7vh;
      background:#2f4a6d;border-radius:2px}
    .tg-car .roof{position:absolute;left:-1%;right:-1%;top:-9%;height:18%;border-radius:999px;background:#2f4a6d}
    .tg-car .win{position:absolute;left:9%;right:9%;top:16%;bottom:26%;border-radius:12%;overflow:hidden;
      background:#eaf7ff;box-shadow:inset 0 0 0 .35vh rgba(47,74,109,.35);display:grid;place-items:center}
    .tg-car .seat{position:absolute;left:20%;right:20%;bottom:6%;height:28%;border-radius:999px;background:#cfe3f2;transition:opacity .2s}
    .tg-car .who{font-size:calc(var(--cw)*.5);line-height:1;transform:scale(0);
      transition:transform .4s cubic-bezier(.3,1.6,.5,1);position:relative;z-index:1}
    .tg-car.full .who{transform:scale(1)}
    .tg-car.full .seat{opacity:0}
    .tg-car.full{box-shadow:inset 0 -.9vh 0 rgba(0,0,0,.12),0 0 0 .5vh #fff9c4,0 3px 0 rgba(31,58,95,.18)}
    .tg-car.pop{animation:tg-carpop .5s ease-out}
    @keyframes tg-carpop{35%{transform:translateY(-9%) scale(1.05)}70%{transform:translateY(0) scale(.99)}}
    .tg-car .wheel{width:25%}
    .tg-car .wheel.l{left:9%}.tg-car .wheel.r{right:9%}
    .tg-steam{position:absolute;left:12%;bottom:84%;width:1.2em;height:1.2em;border-radius:50%;z-index:4;
      background:radial-gradient(circle at 34% 32%,#fff,#e7f1f8);pointer-events:none;
      box-shadow:0 0 0 .25em rgba(255,255,255,.45);animation:tg-puff 1.3s ease-out forwards}
    @keyframes tg-puff{from{opacity:.95;transform:translate(0,0) scale(.5)}
      to{opacity:0;transform:translate(var(--dx,0px),-3.4em) scale(var(--sc,2))}}

    /* ---------- Perron ---------- */
    .tg-platform{position:absolute;left:0;right:0;bottom:0;height:var(--ph);z-index:7;
      background:linear-gradient(#efe9da,#ddd3bd 60%,#cfc3aa);
      box-shadow:inset 0 .4vh 0 rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center}
    .tg-platform::before{content:"";position:absolute;left:0;right:0;top:0;height:1.1vh;
      background:repeating-linear-gradient(90deg,#ffd166 0 3vh,#ffe6a8 3vh 6vh)}
    .tg-platform::after{content:"";position:absolute;left:0;right:0;bottom:0;height:12%;
      background:repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 1px,rgba(0,0,0,0) 1px 4vh)}
    /* Et tegnet stationsur ved perronkanten */
    .tg-plade{position:absolute;left:2.6vw;top:0;transform:translateY(-62%);z-index:2;pointer-events:none;
      width:clamp(30px,5.4vh,50px);aspect-ratio:1;border-radius:50%;background:#fffdf7;
      box-shadow:inset 0 0 0 .5vh #2f4a6d,0 4px 0 rgba(31,58,95,.16)}
    .tg-plade::before,.tg-plade::after{content:"";position:absolute;left:50%;bottom:50%;width:9%;
      background:#2f4a6d;border-radius:99px;transform-origin:50% 100%}
    .tg-plade::before{height:26%;transform:translateX(-50%) rotate(-60deg)}
    .tg-plade::after{height:36%;transform:translateX(-50%) rotate(0deg)}
    .tg-plade i{position:absolute;left:50%;top:50%;width:14%;aspect-ratio:1;border-radius:50%;
      background:#ff6b6b;transform:translate(-50%,-50%)}
    .tg-potte{position:absolute;right:2.6vw;top:0;transform:translateY(-58%);z-index:2;
      font-size:clamp(20px,3.6vh,34px);pointer-events:none;opacity:.95;
      filter:drop-shadow(0 3px 3px rgba(31,58,95,.18))}
    /* ---------- Gemmesteder: dyrene kigger frem bag ting rundt i verden ---------- */
    .gz{position:absolute;width:var(--gs);height:var(--gs);padding:0;background:none;z-index:8}
    .gz-dak{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:calc(var(--gs)*.74);line-height:1;z-index:2;
      filter:drop-shadow(0 .5vh .4vh rgba(31,58,95,.22));transform-origin:50% 100%}
    .gz-dyr{position:absolute;left:0;right:0;bottom:44%;text-align:center;font-size:calc(var(--gs)*.62);line-height:1;z-index:1;
      opacity:0;transform:translateY(55%) scale(.6)}
    .gz.aktiv .gz-dyr{opacity:1;animation:tg-kig 2.2s ease-in-out infinite}
    @keyframes tg-kig{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-9%) rotate(4deg)}}
    .gz.aktiv .gz-dak{animation:tg-dak 2.2s ease-in-out infinite}
    @keyframes tg-dak{0%,100%{transform:rotate(0)}50%{transform:rotate(-1.6deg)}}
    .gz.ud .gz-dyr{animation:none;opacity:1;transform:translateY(-40%) scale(1.18);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
    .gz.ud .gz-dak{animation:none;transform:rotate(-7deg) translateY(3%)}
    .gz.vaek .gz-dyr{opacity:0;animation:none}
    .gz.ryst .gz-dak{animation:tg-ryst .45s ease-out}
    @keyframes tg-ryst{20%,60%{transform:rotate(-7deg)}40%,80%{transform:rotate(7deg)}}
    .gz.kom .gz-dak{animation:tg-kom .45s ease-out backwards}
    @keyframes tg-kom{from{transform:scale(.5);opacity:0}}
    .gz.hint .gz-dak{animation:tg-hintdak 1s ease-in-out infinite;
      filter:drop-shadow(0 0 1.2vh rgba(255,240,150,.98)) drop-shadow(0 0 .5vh rgba(255,240,150,.95))}
    @keyframes tg-hintdak{50%{transform:translateY(-8%) scale(1.07)}}
    /* Plads: tre nede på perronen, to oppe på bakken. Ikke i vejen for sol, mølle og ko */
    .gz.s1{left:6%;bottom:calc(var(--ph)*.05)}
    .gz.s2{left:calc(50% - var(--gs)/2);bottom:calc(var(--ph)*.02)}
    .gz.s3{right:6%;bottom:calc(var(--ph)*.05)}
    .gz.s4{left:24%;bottom:calc(var(--ph) + 27vh)}
    .gz.s5{right:20%;bottom:calc(var(--ph) + 25vh)}
    @media (max-aspect-ratio:1/1){
      .gz.s1{left:3%}.gz.s3{right:3%}
      .gz.s4{left:30%;bottom:calc(var(--ph) + 17vh)}
      .gz.s5{right:5%;bottom:calc(var(--ph) + 21vh)}
    }
    .tg-ghost{position:absolute;z-index:9;line-height:1;pointer-events:none;
      transform:translate(-50%,-50%);
      transition:transform .55s cubic-bezier(.4,1.3,.6,1),opacity .35s}

    /* ---------- Besked, landemærker, fest ---------- */
    .tg-prompt{position:absolute;left:50%;top:calc(14vh + env(safe-area-inset-top,0px));transform:translateX(-50%);
      z-index:8;font-weight:800;font-size:clamp(26px,min(6.4vh,8vw),62px);white-space:nowrap;
      padding:.1em .6em;border-radius:999px;background:rgba(255,253,247,.86);box-shadow:0 5px 0 rgba(31,58,95,.18);
      pointer-events:none}
    .tg-prompt:empty{display:none}
    .tg-land{position:absolute;left:0;bottom:calc(var(--ph) + 4.2vh);z-index:3;
      width:calc(var(--lw)*2.4);height:calc(var(--lw)*.95)}
    .tg-land>*{position:absolute}
    /* Tunnelen: en græsbakke med en stenport, så høj at toget kan køre ind i den */
    .tg-land.tunnel{z-index:6;height:calc(var(--lw)*1.3)}
    .tg-land.tunnel .hillback{inset:0;border-radius:50% 50% 4% 4%/78% 78% 3% 3%;
      background:radial-gradient(ellipse 70% 40% at 38% 18%,rgba(255,255,255,.28),rgba(255,255,255,0) 70%),
        linear-gradient(#b2e39a,#82c46f 62%,#5f9f52);box-shadow:inset 0 -.7vh 0 rgba(0,0,0,.12)}
    .tg-land.tunnel .portal{left:23%;right:23%;bottom:0;height:84%;border-radius:50% 50% 0 0/42% 42% 0 0;
      background:repeating-conic-gradient(from -90deg at 50% 58%,#d9d3c7 0 13deg,#9c958a 13deg 15deg);
      box-shadow:inset 0 0 0 .35vh rgba(70,62,52,.35),0 .5vh 0 rgba(0,0,0,.12)}
    .tg-land.tunnel .arch{left:31%;right:31%;bottom:0;height:72%;
      background:radial-gradient(ellipse 60% 50% at 50% 100%,#4a3f63,#1d1830 70%);
      border-radius:50% 50% 0 0/38% 38% 0 0;box-shadow:inset 0 1.4vh 2vh rgba(0,0,0,.6)}
    .tg-land.tunnel .sten{left:46%;width:8%;top:14%;height:12%;background:#ece7dc;border-radius:.4vh;
      box-shadow:inset 0 0 0 .3vh rgba(70,62,52,.3)}
    .tg-land.tunnel .pynt{font-size:calc(var(--lw)*.17);line-height:1}
    /* Broen: toget kører hen over den. Under sporet buer af sten over en å, foran hjulene et lavt rækværk */
    .tg-land.bro{z-index:6;bottom:var(--ph);width:calc(var(--lw)*2.6);height:calc(6.8vh + var(--lw)*.17)}
    .tg-land.bro .water{left:-6%;right:-6%;bottom:0;height:3.4vh;border-radius:1.4vh 1.4vh 0 0;
      background:radial-gradient(ellipse 50% 40% at 50% 0,rgba(255,255,255,.75) 0 40%,rgba(255,255,255,0) 44%) 0 .5vh/4vh 1.2vh repeat-x,
        linear-gradient(#8fd3f7,#4fa6dd)}
    .tg-land.bro .buer{left:0;right:0;bottom:0;height:5vh;
      background:radial-gradient(ellipse 38% 74% at 50% 100%,rgba(0,0,0,0) 97%,#c9b48f 100%) 0 0/25% 100% repeat-x;
      box-shadow:inset 0 .5vh 0 rgba(255,255,255,.35)}
    .tg-land.bro .kant{left:-1%;right:-1%;bottom:4.4vh;height:1vh;background:#a8834f;border-radius:.4vh}
    .tg-land.bro .rail{left:0;right:0;bottom:6.6vh;height:calc(var(--lw)*.17);
      background:linear-gradient(#e85d5d,#c94444) 0 0/100% 22% no-repeat,
        linear-gradient(#e85d5d,#c94444) 0 60%/100% 14% no-repeat,
        repeating-linear-gradient(90deg,#d94b4b 0 1vh,rgba(0,0,0,0) 1vh 7vh);
      border-radius:.4vh .4vh 0 0;filter:drop-shadow(0 .3vh 0 rgba(0,0,0,.15))}
    /* Byen: huse med tage, oplyste vinduer og døre, kirketårn med ur, butik med markise */
    .tg-land.by{width:calc(var(--lw)*3.4);height:calc(var(--lw)*1.2)}
    .tg-land.by .hus{bottom:0;border-radius:6% 6% 0 0;background:var(--c);
      box-shadow:inset 0 -.6vh 0 rgba(0,0,0,.1),inset .5vh 0 0 rgba(255,255,255,.25)}
    .tg-land.by .tag{background:var(--t);clip-path:polygon(50% 0,100% 100%,0 100%)}
    .tg-land.by .flad{background:var(--t);border-radius:.4vh}
    .tg-land.by .vind{position:absolute;left:16%;right:16%;top:12%;bottom:30%;display:grid;gap:14% 18%}
    .tg-land.by .vind b{background:linear-gradient(#fff8d2,#ffe58a);border-radius:18%;
      box-shadow:inset 0 0 0 .25vh rgba(31,58,95,.35)}
    .tg-land.by .dor{position:absolute;left:36%;width:28%;bottom:0;height:24%;background:#8a5a3c;
      border-radius:50% 50% 0 0/40% 40% 0 0;box-shadow:inset 0 0 0 .25vh rgba(0,0,0,.18)}
    .tg-land.by .skorsten{background:#b0705a;border-radius:.3vh .3vh 0 0}
    .tg-land.by .ur{border-radius:50%;background:#fffdf7;box-shadow:inset 0 0 0 .35vh #2f4a6d}
    .tg-land.by .ur::before,.tg-land.by .ur::after{content:"";position:absolute;left:50%;bottom:50%;width:9%;
      background:#2f4a6d;border-radius:99px;transform-origin:50% 100%}
    .tg-land.by .ur::before{height:30%;transform:translateX(-50%) rotate(0deg)}
    .tg-land.by .ur::after{height:40%;transform:translateX(-50%) rotate(110deg)}
    .tg-land.by .markise{background:repeating-linear-gradient(90deg,#ff6b6b 0 12.5%,#fffdf7 12.5% 25%);
      border-radius:0 0 30% 30%/0 0 60% 60%;box-shadow:0 .4vh 0 rgba(0,0,0,.12)}
    .tg-land.by .flag{font-size:calc(var(--lw)*.16);line-height:1}
    .tg-land.by .busk{font-size:calc(var(--lw)*.26);line-height:1;bottom:-4%}
    .tg-party{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:2vh;padding:2vh;
      background:radial-gradient(circle at 50% 40%,#fffdf2,#fff0b8);
      animation:tg-fade .4s ease-out}
    @keyframes tg-fade{from{opacity:0}}
    .tg-hurra{font-weight:800;font-size:clamp(34px,9vh,90px);color:#e8474f;text-shadow:0 4px 0 #ffd166}
    .tg-parade{display:grid;grid-template-columns:repeat(6,1fr);gap:2vmin;
      width:min(92vw,880px);font-size:clamp(44px,8.6vmin,92px);line-height:1}
    @media (max-aspect-ratio:1/1){.tg-parade{grid-template-columns:repeat(4,1fr);font-size:clamp(44px,13vw,80px)}}
    .tg-parade span{display:grid;place-items:center;aspect-ratio:1;border-radius:50%;background:var(--c);
      box-shadow:inset 0 -.5vh 0 rgba(0,0,0,.08),0 .5vh 0 rgba(31,58,95,.12);
      animation:tg-wave 1s ease-in-out infinite alternate}
    .tg-parade span:nth-child(2n){animation-delay:-.5s}
    /* Vimpler hen over festen (fri af hjem-knappen i venstre hjørne) */
    .tg-vimpler{position:absolute;left:max(110px,12vw);right:3vw;top:calc(2vh + env(safe-area-inset-top,0px));
      height:9vh;display:flex;justify-content:space-between;pointer-events:none}
    .tg-vimpler::before{content:"";position:absolute;left:0;right:0;top:-.3vh;height:2.5vh;
      border-bottom:.4vh solid #c9a26b;border-radius:0 0 50% 50%/0 0 100% 100%}
    .tg-vimpler i{width:6%;height:min(7vh,9vw);background:var(--c);clip-path:polygon(0 0,100% 0,50% 100%);
      transform:translateY(var(--y));transform-origin:50% 0}
    @keyframes tg-wave{from{transform:rotate(-8deg) translateY(0)}to{transform:rotate(8deg) translateY(-6%)}}

    @media (prefers-reduced-motion:reduce){
      .tg-loco.hop,.tg-cow.hop,.tg-car.pop,.tg-sun.sjov,.tg-party{animation:none}
      .gz.aktiv .gz-dyr,.gz.aktiv .gz-dak,.gz.kom .gz-dak,.gz.ryst .gz-dak{animation:none}
      .gz.aktiv .gz-dyr{transform:none}
      .gz.hint .gz-dak{animation:none}
      .tg-blades{animation:none}
      .tg-parade span{animation:none}
      .tg-car .who{transition:none}
      .tg-drop{animation-duration:1.2s}
    }
  `);

  let root, alive, timers, raf = 0, lastT = 0, W = 0, H = 0, loopW = 1200, clock = 0,
    travel = 0, speed = 0, trainX = 0, tween = null, phase = "", deck = [], dyr = [], raekke = [],
    idx = 0, target = null, boarded = 0, station = 0, hintT = 0, klar = false, land = null;
  const el = {};
  let clouds = [], traeer = [], blomster = [];
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);

  /* ---------- Opbygning ---------- */
  function bygg() {
    root.innerHTML = `<div class="tg">
      <div class="tg-hills far"></div>
      <div class="tg-hills near"></div>
      <div class="tg-trees fjern"></div>
      <button class="tg-cloud c1" aria-label="En sky">☁️</button>
      <button class="tg-cloud c2" aria-label="En sky">☁️</button>
      <button class="tg-cloud c3" aria-label="En sky">☁️</button>
      <button class="tg-sun" aria-label="Solen">🌞</button>
      <button class="tg-mill" aria-label="Vindmøllen"><span class="tg-blades"><i></i><i></i><i></i><i></i></span><span class="tg-tower"></span></button>
      <button class="tg-cow" aria-label="Traktoren på marken">🚜</button>
      <div class="tg-trees"></div>
      <div class="tg-track"></div>
      <div class="tg-flowers"></div>
      <div class="tg-train">
        <button class="tg-loco" aria-label="Lokomotivet">
          <span class="wheel w1"></span><span class="wheel w2"></span><span class="wheel w3"></span>
          <span class="boiler"></span><span class="cab"></span><span class="window"></span><span class="roof"></span>
          <span class="chimney"></span><span class="lamp"></span><span class="eye e1"></span><span class="eye e2"></span>
          <span class="mouth"></span><span class="rod"></span>
        </button>
        <div class="tg-cars"></div>
      </div>
      <div class="tg-platform"><span class="tg-plade" aria-hidden="true"><i></i></span><span class="tg-potte" aria-hidden="true">🌷</span></div>
      ${SPOTS.map(([c, k]) => `<button class="gz ${k}" aria-label="Et gemmested"><span class="gz-dyr"></span><span class="gz-dak">${c}</span></button>`).join("")}
      <div class="tg-prompt" aria-hidden="true"></div>
    </div>`;

    el.tg = q(".tg"); el.train = q(".tg-train"); el.cars = q(".tg-cars"); el.rod = q(".tg-loco .rod");
    el.spots = [...root.querySelectorAll(".gz")];
    el.spots.forEach(sp => { sp.onclick = () => trykSted(sp); });
    el.loco = q(".tg-loco"); el.prompt = q(".tg-prompt");
    el.far = q(".tg-hills.far"); el.near = q(".tg-hills.near");
    el.track = q(".tg-track"); el.trees = q(".tg-trees:not(.fjern)"); el.flowers = q(".tg-flowers");
    el.treesFar = q(".tg-trees.fjern");

    for (let i = 0; i < 3; i++) {
      const d = document.createElement("div");
      d.className = "tg-car"; d.style.setProperty("--c", CARS[i]);
      d.innerHTML = `<span class="roof"></span>
        <span class="win"><span class="seat"></span><span class="who"></span></span>
        <span class="wheel l"></span><span class="wheel r"></span>`;
      el.cars.appendChild(d);
    }
    el.carEls = [...el.cars.children];
    el.wheels = [...root.querySelectorAll(".wheel")];

    // træer og blomster, der glider forbi i hver sin fart
    const TYPER = ["🌳", "🌲", "🌳", "🌿", "🌲", "🌳"];
    for (let i = 0; i < 9; i++) lagTrae(el.trees, TYPER[i % TYPER.length], traeer, i, 9, .8, 1.35);
    for (let i = 0; i < 7; i++) lagTrae(el.treesFar, i % 2 ? "🌲" : "🌳", traeer, i, 7, .85, 1.25, true);
    const BLOMSTER = ["🌼", "🌷", "🌼", "🌿", "🌸", "🌼", "🌻", "🌿", "🌼", "🌷"];
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("span");
      s.className = "tg-sprite"; s.textContent = BLOMSTER[i];
      s.style.fontSize = (.75 + Math.random() * .5).toFixed(2) + "em";
      el.flowers.appendChild(s);
      blomster.push({ el: s, f: (i + Math.random() * .5) / 10 });
    }

    clouds = [
      { el: q(".tg-cloud.c1"), x: 0, v: 14 },
      { el: q(".tg-cloud.c2"), x: 0, v: 9 },
      { el: q(".tg-cloud.c3"), x: 0, v: 11 }
    ];
  }

  // Et træ i en af landskabs-lagene (samme liste, så de glider sammen)
  function lagTrae(lag, tegn, liste, i, antal, min, max, fjern) {
    const s = document.createElement("span");
    s.className = "tg-sprite"; s.textContent = tegn;
    s.style.fontSize = (min + Math.random() * (max - min)).toFixed(2) + "em";
    lag.appendChild(s);
    liste.push({ el: s, f: (i + Math.random() * .6) / antal, fjern: !!fjern });
  }

  function layout() {
    if (!alive) return;
    W = el.tg.clientWidth || innerWidth;
    H = el.tg.clientHeight || innerHeight;
    loopW = Math.max(W * 1.7, 1000);
    if (!klar) {
      klar = true;
      clouds[0].x = W * .06; clouds[1].x = W * .56; clouds[2].x = W * .34;
    }
    else clouds.forEach(c => { c.x = mod(c.x, W + 220) - 110; });
  }

  /* ---------- Animation ---------- */
  const fart = () => Math.max(150, W * .22);

  function frame(t) {
    if (!alive) return;
    if (!lastT) lastT = t;
    const dt = Math.min(.05, (t - lastT) / 1000);
    lastT = t;
    update(dt);
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    clock += dt;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      trainX = tween.from + (tween.to - tween.from) * tween.ease(tween.t);
      if (tween.t >= 1) { const d = tween.done; tween = null; d && d(); }
    }
    const maal = tween ? (phase === "depart" ? 1.5 : 1) : 0;
    speed += (maal - speed) * Math.min(1, dt * 4);
    if (!still) travel += speed * fart() * dt;

    const bob = (!still && speed > .04) ? Math.sin(clock * 15) * Math.min(3, speed * 3) : 0;
    el.train.style.transform = `translate3d(${trainX.toFixed(1)}px,${bob.toFixed(1)}px,0)`;
    // Toget kører mod venstre, så hjulene drejer mod uret (negativ vinkel) og landskabet glider mod højre
    const spin = still ? 0 : mod(-travel * 2.2, 360);
    el.wheels.forEach(w => w.style.setProperty("--spin", spin.toFixed(1) + "deg"));
    // kobberstangen følger hjulene i en lille cirkel
    const sr = spin * Math.PI / 180, rr = el.loco.clientWidth * .028;
    el.rod.style.transform = `translate(${(Math.sin(sr) * rr).toFixed(1)}px,${(-Math.cos(sr) * rr).toFixed(1)}px)`;

    traeer.forEach(s => { s.el.style.transform = `translate3d(${mod(s.f * loopW + travel * (s.fjern ? .78 : 1.02), loopW).toFixed(1)}px,0,0)`; });
    blomster.forEach(s => { s.el.style.transform = `translate3d(${mod(s.f * loopW + travel * 1.22, loopW).toFixed(1)}px,0,0)`; });
    el.track.style.backgroundPositionX = travel + "px";
    el.far.style.backgroundPositionX = (travel * .3) + "px";
    el.near.style.backgroundPositionX = (travel * .55) + "px";

    clouds.forEach(c => {
      if (!still) { c.x += c.v * dt; if (c.x > W + 140) c.x = -160; }
      c.el.style.transform = `translateX(${c.x.toFixed(1)}px)`;
    });

    if (land) {
      // glider med jorden (samme fart som træerne), så toget kører ind i det
      land.x += (still ? 0 : speed * fart() * 1.02 * dt) + fart() * .35 * dt;
      land.el.style.transform = `translateX(${land.x.toFixed(1)}px)`;
      if (land.x > W + 40) { land.el.remove(); land = null; }
    }
  }

  /* ---------- Lyd og damp ---------- */
  function tut(lang) {
    Spil.tone([560, 840], .17, "square");
    if (lang) later(() => Spil.tone([560, 840], .28, "square"), 430);
    damp(lang ? 5 : 3);
    el.loco.classList.remove("hop"); void el.loco.offsetWidth; el.loco.classList.add("hop");
  }
  function damp(n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "tg-steam";
      s.style.animationDelay = (i * .08) + "s";
      s.style.setProperty("--dx", (Math.random() * 34 - 17).toFixed(0) + "px");
      s.style.setProperty("--sc", (1.5 + Math.random()).toFixed(2));
      el.loco.appendChild(s);
      later(() => s.remove(), 1500 + i * 90);
    }
  }

  /* ---------- Stationer ---------- */
  function tomVogne() {
    el.carEls.forEach(c => { c.classList.remove("full", "pop"); c.querySelector(".who").textContent = ""; });
  }

  function nyStation() {
    if (!alive) return;
    phase = "arrive"; target = null; boarded = 0; idx = 0;
    if (deck.length < 3) deck = Spil.shuffle(ANIMALS.slice());
    dyr = deck.splice(0, 3);
    raekke = Spil.shuffle(dyr.slice());
    tomVogne();
    hvilSteder();
    el.prompt.textContent = "";
    trainX = W + 100; // toget holder uden for skærmen til højre og ruller ind
    tween = { from: trainX, to: 0, t: 0, dur: still ? 1.5 : 2.0, ease: easeOut, done: () => {
      if (!alive) return;
      byggPerron();
      phase = "ask";
      spoerg();
    } };
  }

  // Alle gemmesteder tomme igen (nyt tog ruller ind)
  function hvilSteder() {
    el.spots.forEach(sp => {
      sp.classList.remove("aktiv", "vaek", "ud", "hint", "ryst", "kom");
      sp._a = null; sp.querySelector(".gz-dyr").textContent = "";
    });
  }

  // Tre tilfældige gemmesteder får hvert sit dyr, der kigger frem
  function byggPerron() {
    hvilSteder();
    const steder = Spil.shuffle(el.spots.slice());
    dyr.forEach((a, i) => {
      const sp = steder[i];
      sp._a = a;
      sp.querySelector(".gz-dyr").textContent = a[0];
      sp.querySelector(".gz-dyr").style.animationDelay = (-i * .7) + "s";
      sp.classList.add("aktiv");
    });
    el.spots.forEach(sp => {
      sp.classList.add("kom"); later(() => sp.classList.remove("kom"), 700);
    });
  }

  function spoerg() {
    if (!alive || !raekke[idx]) return;
    target = raekke[idx];
    el.prompt.textContent = "Find " + target[1] + "!";
    Spil.say("Find " + target[1] + "!", null, "find-" + target[2]);
    hintOm();
  }

  function knapFor(a) {
    return el.spots.find(sp => sp._a === a && !sp.classList.contains("vaek")) || null;
  }

  function hintOm() {
    clearTimeout(hintT);
    hintT = setTimeout(() => {
      if (!alive || phase !== "ask" || !target) return;
      const b = knapFor(target);
      if (b) b.classList.add("hint");
    }, 8000);
  }

  const ryst = sp => { sp.classList.remove("ryst"); void sp.offsetWidth; sp.classList.add("ryst"); };

  function trykSted(sp) {
    if (!alive) return;
    const a = sp._a;
    if (!a || sp.classList.contains("vaek")) {
      // Der er ingen hjemme her: en lille "plop" og en rystelse, så det altid giver en reaktion
      Spil.tone([420, 330], .07, "sine"); ryst(sp);
      return;
    }
    tryk(sp, a);
  }

  function tryk(sp, a) {
    if (!alive) return;
    if (a === target) {
      if (phase === "ask") ombord(sp, a);
      return;
    }
    // Forkert dyr: det kigger frem et øjeblik, blid feedback, og opgaven gentages
    sp.classList.add("ud"); sp.classList.remove("hint");
    later(() => sp.classList.remove("ud"), 1100);
    Spil.sfx.wrong();
    if (phase === "ask" && target) {
      Spil.say("Det er " + a[3] + ". Find " + target[1] + "!", null, ["er-" + a[2], "find-" + target[2]]);
      hintOm();
    } else {
      Spil.say("Det er " + a[3] + ".", null, "er-" + a[2]);
    }
  }

  function ombord(sp, a) {
    phase = "board";
    clearTimeout(hintT);
    el.prompt.textContent = "";
    el.spots.forEach(x => x.classList.remove("hint"));
    const car = el.carEls[boarded];
    ghost(sp.querySelector(".gz-dyr"), car, a[0], () => {
      if (!alive) return;
      car.querySelector(".who").textContent = a[0];
      car.classList.add("full", "pop");
      Spil.burstAt(car, "⭐✨⭐✨");
      later(() => car.classList.remove("pop"), 600);
    });
    sp.classList.remove("ud"); sp.classList.add("vaek"); ryst(sp);
    Spil.sfx.right();
    boarded++; idx++;
    // Vent på, at "Ja! Hør, hvad fåret siger!" og dyrets lyd er talt helt færdig, før det går videre.
    // Et nyt tryk kan afbryde replikken (så kommer færdig-kaldet aldrig), så en timer sikrer, at spillet alligevel går videre.
    let gik = false;
    const videre = () => {
      if (gik || !alive) return;
      gik = true;
      if (boarded >= 3) afgang();
      else { phase = "ask"; spoerg(); }
    };
    const tidligst = Date.now() + 1800;
    Spil.say("Ja! Hør, hvad " + a[1] + " siger!", () => later(videre, Math.max(450, tidligst - Date.now())), Spil.jaDyr(a[2]));
    later(videre, 8000);
  }

  function ghost(fra, til, tegn, faerdig) {
    const g = document.createElement("div");
    g.className = "tg-ghost"; g.textContent = tegn;
    const tgR = el.tg.getBoundingClientRect();
    const a = fra.getBoundingClientRect(), z = til.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - tgR.left, y0 = a.top + a.height / 2 - tgR.top;
    const x1 = z.left + z.width / 2 - tgR.left, y1 = z.top + z.height * .52 - tgR.top;
    const str = a.width * .74, k = (z.width * .5) / str;
    g.style.left = x0 + "px"; g.style.top = y0 + "px"; g.style.fontSize = str + "px";
    el.tg.appendChild(g);
    requestAnimationFrame(() => {
      if (!alive) { g.remove(); return; }
      g.style.transform = `translate(-50%,-50%) translate(${(x1 - x0).toFixed(1)}px,${(y1 - y0).toFixed(1)}px) scale(${k.toFixed(2)})`;
    });
    later(() => { g.remove(); faerdig(); }, 620);
  }

  /* ---------- Afgang, landemærker og fest ---------- */
  function afgang() {
    phase = "depart";
    el.prompt.textContent = "";
    tut(true);
    Spil.say("Alle er med! Nu kører toget!", null, "tog-klar");
    const land = LAND[station % LAND.length];
    // Landemærket kommer med det samme, så toget når at køre ind i tunnelen / over broen, mens man kan se det
    later(() => { if (alive) visLand(land); }, still ? 200 : 60);
    tween = { from: trainX, to: -(W + el.train.offsetWidth + 140), t: 0, dur: still ? 1.6 : 2.4, ease: easeIn,
      done: () => {
        if (!alive) return;
        station++;
        if (station >= STATIONER) fest();
        else nyStation();
      } };
  }

  // Byens huse: x, bredde, højde (i % af byen), farve, tag-farve, tag-type, vinduer (kolonner x rækker), ekstra
  const BY = [
    [0, 14, 52, "#ffb4a2", "#d9534f", "spids", 2, 2, "skorsten"],
    [15.5, 12, 76, "#a9d6f5", "#4f7fb4", "flad", 2, 4],
    [29, 10, 92, "#fff1d6", "#7b5ea7", "taarn", 1, 2],
    [41, 16, 50, "#ffe08a", "#e0a030", "spids", 3, 2],
    [58.5, 12, 84, "#c8b6f0", "#6e58a8", "flad", 2, 4, "flag"],
    [72, 14, 46, "#b8e2ae", "#5f9f52", "flad", 2, 1, "markise"],
    [87.5, 11, 64, "#ffc8dd", "#d36b97", "spids", 1, 3],
  ];
  function byHTML() {
    const AR = 3.4 / 1.2; // byens bredde/højde, så tage kan være rigtige trekanter
    let h = "";
    BY.forEach(([x, w, hh, c, t, tag, kol, rk, ekstra]) => {
      const vind = `<span class="vind" style="grid-template-columns:repeat(${kol},1fr);grid-template-rows:repeat(${rk},1fr)">${"<b></b>".repeat(kol * rk)}</span>`;
      h += `<span class="hus" style="left:${x}%;width:${w}%;height:${hh}%;--c:${c}">${vind}<span class="dor"></span></span>`;
      if (tag === "spids") {
        const th = w * AR * .42;
        h += `<span class="tag" style="left:${x - 1.2}%;width:${w + 2.4}%;bottom:${hh - .5}%;height:${th}%;--t:${t}"></span>`;
        if (ekstra === "skorsten") h += `<span class="skorsten" style="left:${x + w * .66}%;width:${w * .13}%;bottom:${hh + th * .35}%;height:${th * .55}%"></span>`;
      } else if (tag === "flad") {
        h += `<span class="flad" style="left:${x - .8}%;width:${w + 1.6}%;bottom:${hh - 1}%;height:5%;--t:${t}"></span>`;
        if (ekstra === "flag") h += `<span class="flag" style="left:${x + w * .3}%;bottom:${hh + 3}%">🚩</span>`;
        if (ekstra === "markise") h += `<span class="markise" style="left:${x - 1}%;width:${w + 2}%;bottom:${hh * .5}%;height:${hh * .2}%"></span>`;
      } else if (tag === "taarn") {
        const th = w * AR * 1.15; // højt spir
        h += `<span class="tag" style="left:${x - .6}%;width:${w + 1.2}%;bottom:${hh - .5}%;height:${th}%;--t:${t}"></span>`;
        const d = w * .62;
        h += `<span class="ur" style="left:${x + (w - d) / 2}%;width:${d}%;height:${d * AR}%;bottom:${hh - d * AR - 6}%"></span>`;
      }
    });
    // små buske foran husene
    [[9, "🌳"], [37, "🌳"], [68, "🌳"], [84, "🌳"]].forEach(([x, e]) => { h += `<span class="busk" style="left:${x}%">${e}</span>`; });
    return h;
  }

  function visLand(kind) {
    if (land) { land.el.remove(); land = null; }
    const d = document.createElement("div");
    d.className = "tg-land " + kind;
    d.innerHTML = kind === "tunnel" ? `<span class="hillback"></span><span class="portal"></span><span class="arch"></span><span class="sten"></span>`
        + `<span class="pynt" style="left:9%;bottom:22%">🌼</span><span class="pynt" style="left:80%;bottom:30%">🌷</span>`
      : kind === "bro" ? `<span class="water"></span><span class="buer"></span><span class="kant"></span><span class="rail"></span>`
      : byHTML();
    el.tg.appendChild(d);
    if (still) {
      // Roligt: landemærket står stille og toner frem
      d.style.left = "50%"; d.style.transform = "translateX(-50%)"; d.style.opacity = "0";
      d.style.transition = "opacity .5s";
      requestAnimationFrame(() => { if (alive) d.style.opacity = "1"; });
      later(() => d.remove(), 2800);
    } else {
      // Glider forbi fra venstre mod højre, mens toget kører mod venstre (styres i animationsløkken)
      // starter med højre kant lidt inde på skærmen til venstre, så toget kører ind i det
      const w = d.offsetWidth || W;
      land = { el: d, x: Math.min(W * .1, W * .5 - w) - w * .55, w };
      d.style.transform = `translateX(${land.x.toFixed(1)}px)`;
    }
  }

  const FESTFARVER = ["#ffd6e3", "#fff0b0", "#d4f0c8", "#d6ecff"];
  const VIMPEL = ["#ff6b6b", "#ffd166", "#6cc56c", "#5aa9e6"];
  function fest() {
    phase = "party";
    el.prompt.textContent = "";
    const p = document.createElement("div");
    p.className = "tg-party";
    p.innerHTML = `<div class="tg-hurra">Hurra!</div>
      <div class="tg-parade">${ANIMALS.map((a, i) => `<span style="--c:${FESTFARVER[i % 4]}">${a[0]}</span>`).join("")}</div>
      <div class="tg-vimpler">${Array.from({ length: 11 }, (_, i) =>
        `<i style="--c:${VIMPEL[i % 4]};--y:${(Math.sin(Math.PI * i / 10) * 2.2).toFixed(2)}vh"></i>`).join("")}</div>`;
    p.onclick = e => { Spil.sfx.pop(); Spil.burst(e.clientX, e.clientY, "🎉✨⭐🎈"); };
    el.tg.appendChild(p);
    Spil.sfx.fanfare();
    Spil.say("Hurra! Alle dyrene er med toget!", null, "tog-hurra");
    const regn = () => {
      if (!alive || phase !== "party") return;
      Spil.burst(W * (.15 + Math.random() * .7), H * (.15 + Math.random() * .3), "🎉✨⭐🎈🌟");
      later(regn, 1000);
    };
    regn();
    later(() => { if (!alive) return; p.remove(); station = 0; nyStation(); }, 9000);
  }

  /* ---------- Små ting i landskabet ---------- */
  function koblSmå() {
    q(".tg-loco").onclick = () => { if (alive) tut(false); };
    q(".tg-sun").onclick = e => {
      if (!alive) return;
      const s = e.currentTarget;
      s.classList.remove("sjov"); void s.offsetWidth; s.classList.add("sjov");
      Spil.tone([880, 1180], .12, "sine");
      Spil.burstAt(s, "✨☀️✨");
    };
    [q(".tg-cloud.c1"), q(".tg-cloud.c2"), q(".tg-cloud.c3")].forEach(c => { c.onclick = () => { if (alive) regn(c); }; });
    q(".tg-mill").onclick = e => {
      if (!alive) return;
      const m = e.currentTarget;
      m.classList.remove("snur"); void m.offsetWidth; m.classList.add("snur");
      Spil.tone([300, 380, 460], .08, "triangle");
      later(() => m.classList.remove("snur"), 2600);
    };
    // Traktoren på marken (ikke et af dyrene, så den ikke kan forveksles med "Find koen!"): dytter og hopper
    q(".tg-cow").onclick = e => {
      if (!alive) return;
      const c = e.currentTarget;
      c.classList.remove("hop"); void c.offsetWidth; c.classList.add("hop");
      Spil.tone([392, 523], .09, "square");
      later(() => Spil.tone([392, 523], .09, "square"), 190);
    };
  }

  function regn(btn) {
    Spil.tone([700, 520], .1, "sine");
    const r = btn.getBoundingClientRect(), t = el.tg.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const d = document.createElement("span");
      d.className = "tg-drop"; d.textContent = "💧";
      d.style.left = (r.left - t.left + r.width * (.25 + Math.random() * .45)) + "px";
      d.style.top = (r.top - t.top + r.height * .62) + "px";
      d.style.animationDelay = (i * .07) + "s";
      el.tg.appendChild(d);
      later(() => d.remove(), 1300);
    }
  }

  /* ---------- Dybe links (til test) ----------
     perron            toget holder allerede ved perronen, og stemmen spørger med det samme
     tunnel / bro / by  vognene er fulde, og toget kører af sted forbi det landemærke
     fest              festen til sidst */
  function dybStart(d) {
    if (d === "perron") { nyStation(); tween = null; trainX = 0; byggPerron(); phase = "ask"; spoerg(); return true; }
    const li = LAND.indexOf(d);
    if (li >= 0) {
      station = li; phase = "board";
      dyr = deck.splice(0, 3);
      el.carEls.forEach((c, i) => { c.querySelector(".who").textContent = dyr[i][0]; c.classList.add("full"); });
      boarded = 3;
      later(afgang, 300);
      return true;
    }
    if (d === "fest") { station = STATIONER; later(fest, 200); return true; }
    return false;
  }

  /* ---------- Start og stop ---------- */
  Spil.register({
    id: "toget", navn: "Toget", ikon: "🚂", farve: "#a9c6f2",
    start(r) {
      root = r; alive = true; timers = []; clock = 0; travel = 0; speed = 0; trainX = 0;
      tween = null; phase = ""; target = null; boarded = 0; idx = 0; station = 0; lastT = 0; klar = false;
      deck = Spil.shuffle(ANIMALS.slice()); dyr = []; raekke = []; traeer = []; blomster = []; clouds = []; land = null;
      Spil.preload(ANIMALS.flatMap(a => ["find-" + a[2], "er-" + a[2], "ja-" + a[2], "dyr-" + a[2]])
        .concat(["tog-hej", "tog-klar", "tog-hurra"]));
      bygg();
      koblSmå();
      addEventListener("resize", layout);
      layout();
      raf = requestAnimationFrame(frame);
      if (dybStart(Spil.dyb || "")) return;
      later(() => Spil.say("Hej! Hjælp dyrene med at komme med toget!", null, "tog-hej"), 350);
      later(nyStation, 2400);
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout); timers = [];
      clearTimeout(hintT);
      land = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      removeEventListener("resize", layout);
    }
  });

  // Til test: Spil.toget.visLand("by") viser et landemærke med det samme, mens spillet kører
  Spil.toget = { visLand: k => { if (alive) visLand(k); } };
})();
