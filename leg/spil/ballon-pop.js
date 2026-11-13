// Spil: Ballon-pop — balloner flyver op over en eng, tryk for at poppe. Stemmen siger farven,
// og hver farve spiller sin egen tone, så man laver musik, mens man popper.
// Nogle balloner har et dyr indeni: det daler ned på engen og bliver der (tryk på det, så siger det sin lyd).
// For hver 10 balloner kommer en kæmpe-ballon, som skal have tre tryk. Ingen tabe-tilstand.
(function () {
  // farve, navn, tone (C-dur pentaton, så alt lyder pænt sammen)
  const COLORS = [
    ["#ff5c5c", "rød", 523], ["#ff9f43", "orange", 587], ["#ffc93c", "gul", 659], ["#5cc46b", "grøn", 784],
    ["#4d96ff", "blå", 880], ["#b57dff", "lilla", 1047], ["#ff7fbf", "lyserød", 1175]
  ];
  // Dyr der kan sidde i en ballon (lydene ja-<dyr> findes fra Find dyret)
  const DYR = [["🐄", "ko"], ["🐈", "kat"], ["🐕", "hund"], ["🐖", "gris"], ["🦆", "and"], ["🐑", "faar"],
    ["🐸", "froe"], ["🐔", "hoene"], ["🐭", "mus"], ["🐘", "elefant"], ["🐒", "abe"], ["🐻", "bjoern"]];
  const PRAISE = ["Super!", "Flot klaret!", "Sejt!", "Du er god til det!", "Wow!"];
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  // Krøllet snor under ballonen
  const SNOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 100"><path d="M10 0 C2 12 18 22 10 34 C2 46 18 56 10 68 C4 78 14 88 10 100" fill="none" stroke="#ffffff" stroke-opacity=".85" stroke-width="2"/></svg>')}")`;

  Spil.css("css-ballon-pop", `
    .bp{position:relative;height:100%;overflow:hidden;overflow:clip;background:linear-gradient(#6ec0f0 0%,#a9dcfa 48%,#d8f1ff 66%)}
    .bp-sun{position:absolute;right:7%;top:6%;width:clamp(70px,14vh,130px);aspect-ratio:1;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,#fff3a0 0 40%,#ffd84a 41% 52%,rgba(255,216,74,.35) 54%,rgba(255,216,74,0) 70%);animation:bp-glow 3s ease-in-out infinite alternate}
    @keyframes bp-glow{to{transform:scale(1.07)}}
    .bp-cloud{position:absolute;height:clamp(28px,5vh,48px);border-radius:99px;background:#fff;opacity:.95;pointer-events:none;animation:bp-drift linear infinite}
    .bp-cloud::before,.bp-cloud::after{content:"";position:absolute;background:#fff;border-radius:50%}
    .bp-cloud::before{width:46%;aspect-ratio:1;left:14%;bottom:30%}
    .bp-cloud::after{width:34%;aspect-ratio:1;right:16%;bottom:36%}
    @keyframes bp-drift{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
    .bp-hill{position:absolute;left:-15%;right:-15%;border-radius:50% 50% 0 0;pointer-events:none}
    /* Den bagerste bakke går helt ned, så himlen ikke titter frem under den ved højre kant */
    .bp-hill.far{bottom:0;height:42%;border-radius:50% 50% 0 0/31% 31% 0 0;background:linear-gradient(#bfe6a8,#9fd486 62%)}
    .bp-hill.near{bottom:0;height:22%;left:-25%;right:-5%;background:linear-gradient(#95d775,#5fae4a);border-radius:60% 40% 0 0/100% 100% 0 0}
    .bp-tree{position:absolute;bottom:17%;width:clamp(10px,1.6vh,18px);height:clamp(40px,9vh,90px);background:#8a592e;border-radius:6px;pointer-events:none}
    .bp-tree::before{content:"";position:absolute;left:50%;bottom:70%;width:clamp(50px,11vh,110px);aspect-ratio:1;transform:translateX(-50%);border-radius:50%;
      background:radial-gradient(circle at 32% 30%,#a6df92 0 14%,transparent 15%),radial-gradient(circle at 50% 60%,#5aa94f,#3d7f3a 75%)}
    /* Blomst: gul midte, fem kronblade (skygger af midten), stilk og et blad */
    .bp-flower{position:absolute;font-size:clamp(8px,1.5vh,13px);width:1em;height:1em;border-radius:50%;pointer-events:none;background:#ffd84a;
      box-shadow:0 -.78em 0 .08em var(--f),.74em -.24em 0 .08em var(--f),.46em .63em 0 .08em var(--f),-.46em .63em 0 .08em var(--f),-.74em -.24em 0 .08em var(--f)}
    .bp-flower::before{content:"";position:absolute;left:50%;top:1.2em;width:.24em;height:2.4em;margin-left:-.12em;background:#3d7f3a;border-radius:.12em}
    .bp-flower::after{content:"";position:absolute;left:.5em;top:2em;width:1.15em;height:.55em;background:#4f9a43;border-radius:0 100% 0 100%;transform:rotate(-20deg)}
    .bp-count{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);
      background:var(--card);border-radius:999px;padding:.2em .8em;font-weight:800;font-size:clamp(26px,5vh,48px);
      box-shadow:0 5px 0 #8fc3e0;z-index:3;font-variant-numeric:tabular-nums;pointer-events:none}

    /* Ballonerne: blank overflade med lys, knude og krøllet snor */
    /* Ballonform: bred top, smallere ned mod knuden; skarpt lys oppe til venstre og skygge i kanten */
    .bp .balloon{border-radius:50% 50% 50% 50%/40% 40% 60% 60%;
      background:radial-gradient(11% 16% at 31% 25%,rgba(255,255,255,.9) 55%,rgba(255,255,255,0) 100%),
      radial-gradient(4% 5% at 24% 44%,rgba(255,255,255,.6) 50%,rgba(255,255,255,0) 100%),
      radial-gradient(70% 70% at 38% 32%,rgba(255,255,255,.18),rgba(255,255,255,0) 55%,rgba(0,0,0,.2) 100%),var(--c);
      box-shadow:inset -5px -8px 14px rgba(0,0,0,.1);z-index:2}
    .bp .balloon::before{content:"";position:absolute;left:50%;top:97%;width:17%;height:7%;transform:translateX(-50%);background:var(--c);
      clip-path:polygon(32% 0,68% 0,100% 100%,0 100%);border-radius:0 0 40% 40%;filter:brightness(.78)}
    .bp .balloon::after{width:16px;height:9vh;background:${SNOR} center/100% 100% no-repeat;transform:translateX(-50%);top:104%}
    /* Gennemsigtig ballon med et stort dyr indeni og lyset ovenpå, så dyret ser ud til at sidde bag gummiet */
    .bp .balloon.dyr{--c:#e9f6ff;border:2px solid rgba(255,255,255,.85);
      background:radial-gradient(70% 70% at 40% 34%,rgba(255,255,255,.35),rgba(255,255,255,.12) 55%,rgba(150,205,240,.55) 100%);
      box-shadow:inset -5px -8px 16px rgba(80,150,210,.25),0 0 0 1px rgba(80,150,210,.18)}
    .bp .balloon.dyr::before{background:#d9efff;filter:none;box-shadow:inset 0 -2px 0 rgba(80,150,210,.35)}
    .bp .balloon.dyr span{position:absolute;inset:0;display:grid;place-items:center;padding-top:8%;font-size:clamp(50px,9vh,92px);line-height:1;pointer-events:none}
    .bp .balloon.dyr span::after{content:"";position:absolute;inset:0;border-radius:inherit;
      background:radial-gradient(11% 16% at 31% 25%,rgba(255,255,255,.95) 55%,rgba(255,255,255,0) 100%),
        radial-gradient(4% 5% at 24% 44%,rgba(255,255,255,.7) 50%,rgba(255,255,255,0) 100%)}
    .bp .balloon.kaempe{--w:clamp(150px,min(30vh,52vw),280px);width:var(--w);left:calc(50% - var(--w) / 2);z-index:3;animation:bp-up 5s ease-out forwards,bp-bob 2s ease-in-out 5s infinite alternate;
      /* Regnbue-ballon: lodrette striber (som en luftballon); skyggen i kanten får dem til at bue */
      background:radial-gradient(11% 16% at 31% 25%,rgba(255,255,255,.9) 55%,rgba(255,255,255,0) 100%),
        radial-gradient(4% 5% at 24% 44%,rgba(255,255,255,.6) 50%,rgba(255,255,255,0) 100%),
        radial-gradient(62% 62% at 42% 36%,rgba(255,255,255,.2),rgba(255,255,255,0) 50%,rgba(0,0,0,.3) 100%),
        linear-gradient(90deg,#ff5c5c 0 14.3%,#ff9f43 0 28.6%,#ffc93c 0 42.9%,#5cc46b 0 57.1%,#4d96ff 0 71.4%,#b57dff 0 85.7%,#ff7fbf 0);
      transition:scale .2s}
    .bp .balloon.kaempe::before{background:#5cc46b}
    @keyframes bp-up{from{transform:translateY(0)}to{transform:translateY(-58vh)}}
    @keyframes bp-bob{from{transform:translateY(-58vh)}to{transform:translateY(-61vh) rotate(3deg)}}
    .bp-bit{position:absolute;width:clamp(10px,1.8vh,16px);height:clamp(6px,1vh,10px);border-radius:3px;pointer-events:none;z-index:4;
      animation:bp-bit .6s ease-out forwards}
    @keyframes bp-bit{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0}}
    .bp-word{position:absolute;font-weight:800;font-size:clamp(30px,6vh,56px);color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.25);
      pointer-events:none;z-index:4;animation:bp-word 1s ease-out forwards}
    @keyframes bp-word{from{transform:translate(-50%,-50%) scale(.6)}30%{transform:translate(-50%,-70%) scale(1.15)}to{transform:translate(-50%,-140%);opacity:0}}
    /* Dyr på engen */
    .bp-pet{position:absolute;bottom:calc(3vh + env(safe-area-inset-bottom,0px));font-size:clamp(46px,9vh,84px);line-height:1;padding:0;background:none;z-index:3;
      transform:translateX(-50%);transition:opacity .4s}
    .bp-pet.fald{animation:bp-fald var(--t) cubic-bezier(.5,0,.8,.6) forwards}
    @keyframes bp-fald{from{transform:translate(-50%,var(--fra)) rotate(-20deg)}75%{transform:translate(-50%,0) rotate(5deg)}88%{transform:translate(-50%,-14%)}to{transform:translate(-50%,0)}}
    .bp-pet.hop{animation:bp-hop .55s}
    @keyframes bp-hop{40%{transform:translate(-50%,-30%) scale(1.1)}}
    .bp-pet.vaek{opacity:0}
    @media (prefers-reduced-motion:reduce){.bp-sun,.bp-cloud,.bp-bit,.bp-pet.fald,.bp-pet.hop{animation:none}.bp .balloon.kaempe{animation:none;transform:translateY(-58vh)}}
  `);

  let root, field, pops, alive, timers, spawner, sinceDyr, giant, pets, ros = false, ventDyr = null;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = sel => root.querySelector(sel);

  // Blød "pling" i ballonens tone oven på et lille pop
  function pling(f) {
    Spil.tone([f, f * 2], .09, "triangle");
    Spil.tone([f], .25, "sine");
  }

  function bits(x, y, col, n = 10) {
    for (let i = 0; i < n; i++) {
      const b = document.createElement("i"); b.className = "bp-bit";
      const a = i / n * Math.PI * 2 + Math.random() * .5, d = 50 + Math.random() * 70;
      b.style.left = x + "px"; b.style.top = y + "px"; b.style.background = col;
      b.style.setProperty("--dx", Math.cos(a) * d + "px"); b.style.setProperty("--dy", Math.sin(a) * d + "px");
      b.style.setProperty("--r", (Math.random() * 540 | 0) + "deg");
      field.appendChild(b); setTimeout(() => b.remove(), 650);
    }
  }
  function centre(el) {
    const r = el.getBoundingClientRect(), fr = field.getBoundingClientRect();
    return [r.left + r.width / 2 - fr.left, r.top + r.height / 2 - fr.top];
  }
  function word(x, y, txt) {
    const w = document.createElement("div"); w.className = "bp-word"; w.textContent = txt;
    w.style.left = x + "px"; w.style.top = y + "px"; field.appendChild(w); setTimeout(() => w.remove(), 1000);
  }
  const count = () => { q(".bp-count").textContent = "🎈 " + pops; };
  // Ballonen springer der, hvor den er (frys positionen, pust op og forsvind)
  function burstB(b) {
    const t = getComputedStyle(b).transform;
    b.classList.add("popped"); b.style.animation = "none"; b.style.transform = t === "none" ? "" : t;
    b.style.transition = "scale .18s ease-out,opacity .18s ease-out"; void b.offsetWidth;
    b.style.scale = (parseFloat(b.style.scale) || 1) * 1.5; b.style.opacity = 0;
    setTimeout(() => b.remove(), 220);
  }

  // opt (kun til dybe links): { dyr: true/false, farve: indeks, left: %, stille: true }
  function spawn(opt = {}) {
    if (!alive) return;
    sinceDyr++;
    const withDyr = opt.dyr ?? (Spil.dyb === "dyr" || (sinceDyr > 5 && Math.random() < .3));
    const b = document.createElement("button");
    b.className = "balloon";
    b.style.left = (opt.left ?? 4 + Math.random() * 82) + "%";
    // Stille: ballonen står midt på himlen og flyver ikke (til at se på formen)
    if (opt.stille) { b.style.animationDelay = "-3.6s"; b.style.animationPlayState = "paused"; }
    b.style.animationDuration = (opt.stille ? 8 : 6 + Math.random() * 4) + "s"; // langsomt nok til små fingre
    b.onanimationend = () => b.remove();
    if (withDyr) {
      sinceDyr = 0;
      const d = DYR[Math.random() * DYR.length | 0];
      b.classList.add("dyr"); b.innerHTML = `<span>${d[0]}</span>`; b.setAttribute("aria-label", "Ballon med dyr");
      b.onpointerdown = () => popDyr(b, d);
    } else {
      const [col, name, f] = COLORS[opt.farve ?? Math.random() * COLORS.length | 0];
      b.style.setProperty("--c", col); b.setAttribute("aria-label", name + " ballon");
      b.onpointerdown = () => {
        if (b.classList.contains("popped")) return;
        const [x, y] = centre(b); burstB(b); Spil.sfx.pop(); pling(f);
        bits(x, y, col); word(x, y, name);
        scored();
        if (!Spil.isTalking()) Spil.say(name, null, `farve-${Spil.key(name)}`); // sig farven, men afbryd ikke ros
      };
    }
    field.appendChild(b);
  }

  function scored() {
    pops++; count();
    if (pops % 10 === 0) later(bigOne, 500);
  }

  // Dyret daler ned på engen og bliver der
  function popDyr(b, d) {
    if (b.classList.contains("popped")) return;
    const [x, y] = centre(b); burstB(b); Spil.sfx.pop(); Spil.tone([784, 988, 1175], .08);
    bits(x, y, "#ffffff", 8);
    scored();
    placePet(d, x, y, true);
    sigDyr(d);
  }

  // Dyret siger sin lyd, men afbryder ikke rosen efter kæmpe-ballonen: så venter det, til der er stille.
  // Popper man flere dyr imens, er det kun det sidste, der venter.
  function sigDyr(d) {
    if (ros && Spil.isTalking()) { const ventede = ventDyr; ventDyr = d; if (!ventede) vent(); return; }
    Spil.say(d[1], null, Spil.jaDyr(d[1]));
  }
  function vent() {
    later(() => {
      if (ros && Spil.isTalking()) return vent();
      const d = ventDyr; ventDyr = null; Spil.say(d[1], null, Spil.jaDyr(d[1]));
    }, 250);
  }

  // Sæt et dyr på engen (fald = dal ned fra x,y; ellers står det der bare)
  function placePet(d, x, y, fald) {
    const p = document.createElement("button"); p.className = "bp-pet" + (fald ? " fald" : ""); p.textContent = d[0];
    p.setAttribute("aria-label", d[1]);
    const fh = field.clientHeight;
    // Find den ledige plads på engen, der er tættest på ballonen (yderste plads mindst 52 px fra kanten, så dyret ikke skæres over)
    const ns = Math.max(3, Math.min(6, field.clientWidth / 110 | 0)), m = Math.max(8, 52 / field.clientWidth * 100), SLOTS = Array.from({ length: ns }, (_, i) => Math.round(m + i * (100 - 2 * m) / (ns - 1))), taken = pets.map(o => o.plads), want = x / field.clientWidth * 100;
    const free = SLOTS.filter(v => !taken.includes(v)), slot = (free.length ? free : SLOTS).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
    if (taken.includes(slot)) { const old = pets.find(o => o.plads === slot); pets = pets.filter(o => o !== old); old.classList.add("vaek"); setTimeout(() => old.remove(), 450); }
    // "plads" og ikke "slot": slot er en indbygget egenskab på elementer, der laver tallet om til tekst
    p.plads = slot; p.style.left = slot + "%";
    field.appendChild(p);
    const fra = y - (fh - p.offsetHeight / 2 - fh * .03);
    p.style.setProperty("--fra", fra + "px"); p.style.setProperty("--t", Math.max(.6, Math.abs(fra) / 700) + "s");
    p.onanimationend = () => p.classList.remove("fald", "hop");
    p.onpointerdown = () => { p.classList.remove("hop"); void p.offsetWidth; p.classList.add("hop"); sigDyr(d); };
    // Højst 6 dyr på engen; det ældste går sin vej
    pets.push(p);
    if (pets.length > SLOTS.length) { const old = pets.shift(); old.classList.add("vaek"); setTimeout(() => old.remove(), 450); }
  }

  // Kæmpe-ballon i alle farver: tre tryk, så springer den med fest og ros
  function bigOne() {
    if (giant) return;
    const b = document.createElement("button");
    b.className = "balloon kaempe"; b.setAttribute("aria-label", "Kæmpe-ballon");
    let hits = 0;
    b.onpointerdown = () => {
      if (b.classList.contains("popped")) return;
      hits++;
      if (hits < 3) {
        b.style.scale = 1 + hits * .15;
        Spil.tone([300 + hits * 150, 500 + hits * 150], .1, "sine");
        return;
      }
      const [x, y] = centre(b); burstB(b); giant = null;
      Spil.sfx.pop(); Spil.sfx.fanfare();
      COLORS.forEach((c, i) => setTimeout(() => alive && bits(x + (Math.random() - .5) * 120, y + (Math.random() - .5) * 120, c[0], 8), i * 60));
      Spil.burst(x + field.getBoundingClientRect().left, y + field.getBoundingClientRect().top, "⭐🌟✨🎉⭐🌟✨🎉");
      const p = Math.random() * PRAISE.length | 0, n = Math.min(200, Math.round(pops / 10) * 10);
      ros = true;
      Spil.say(`${n} balloner! ${PRAISE[p]}`, () => { ros = false; }, [`balloner-${n}`, `ros-${p}`]);
    };
    giant = b;
    field.appendChild(b);
    Spil.tone([392, 523, 659, 784], .1);
  }

  Spil.register({
    id: "ballon-pop", navn: "Ballon-pop", ikon: "🎈", farve: "var(--sky)",
    start(r) {
      root = r; pops = 0; alive = true; timers = []; sinceDyr = 3; giant = null; pets = [];
      const flowers = [["#ff7fbf", 8, 8], ["#fff", 22, 5], ["#ff5c5c", 40, 9], ["#b57dff", 58, 6], ["#fff", 74, 10], ["#ff9f43", 90, 7]]
        .map(([f, x, y]) => `<i class="bp-flower" style="--f:${f};left:${x}%;bottom:${y}%"></i>`).join("");
      root.innerHTML = `<div class="bp">
        <div class="bp-sun"></div>
        <div class="bp-cloud" style="top:12%;width:clamp(90px,16vw,170px);animation-duration:60s;animation-delay:-10s"></div>
        <div class="bp-cloud" style="top:28%;width:clamp(70px,12vw,130px);animation-duration:85s;animation-delay:-50s"></div>
        <div class="bp-hill far"></div>
        <div class="bp-tree" style="left:10%"></div><div class="bp-tree" style="right:14%;bottom:18%"></div>
        <div class="bp-hill near"></div>${flowers}
        <div class="bp-count">🎈 0</div></div>`;
      field = q(".bp");
      Spil.preload([...COLORS.map(c => "farve-" + Spil.key(c[1])), ...PRAISE.map((_, i) => "ros-" + i), ...DYR.flatMap(d => Spil.jaDyr(d[1])),
        ...Array.from({ length: 20 }, (_, i) => `balloner-${(i + 1) * 10}`)]);
      // Dybe links til test: kaempe, dyr, eng, stille
      const dyb = Spil.dyb;
      if (dyb === "stille") {
        COLORS.forEach((_, i) => spawn({ dyr: false, farve: i, left: 3 + i * 11, stille: true }));
        spawn({ dyr: true, left: 80, stille: true });
        return;
      }
      if (dyb === "eng") {
        const w = field.clientWidth;
        DYR.slice(0, 6).forEach(d => placePet(d, w / 2, 0, false));
      }
      if (dyb === "kaempe") { pops = 9; count(); later(scored, 300); }
      Spil.say("Pop ballonerne!", null, "pop-ballonerne");
      for (let i = 0; i < 3; i++) later(spawn, i * 400);
      spawner = setInterval(spawn, 1100);
    },
    stop() { alive = false; clearInterval(spawner); timers.forEach(clearTimeout); ros = false; ventDyr = null; }
  });
})();
