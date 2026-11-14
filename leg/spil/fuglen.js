// Spil: Fuglen — en lille fugl svæver over et levende landskab (eng, skov og sø) gennem et helt døgn.
// Sæt fingeren på skærmen, så flyver fuglen derhen; slipper man, svæver den roligt videre af sig selv.
// Saml lysende frø: hvert frø daler ned og bliver til en blomst (eller en åkande på søen).
// Ti frø giver en ny fugleven, der flyver med. Flyv ind i regnskyen, så regner det, og der kommer en regnbue.
// Flyv lavt hen over dyrene, så siger de noget. Ingen tabe-tilstand: fuglen kan ikke støde ind i noget.
// Alt tegnes på ét <canvas> (ingen billedfiler). Dybe links til test: #fuglen/aften, /nat, /regn, /venner, /skov, /soe
(function () {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const backOut = t => { const c = 1.7; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  /* ---------- Døgnets farver: nøglebilleder, der blandes glidende ---------- */
  const NAT = { top: "#0c1333", bot: "#27346a", far: "#2c3668", snow: "#8f9dca", mid: "#232c58", near: "#1d2b4b",
    ground: "#16283a", grass: "#2d4d55", water: "#24376c", cloud: "#46528a", glow: "#9fb4ff", star: 1 };
  const GRY = { top: "#4f5fae", bot: "#ffc3a0", far: "#a194c8", snow: "#ffe4ec", mid: "#8a9cc4", near: "#6b9c95",
    ground: "#5a9a6a", grass: "#97cf7e", water: "#a8b9e0", cloud: "#ffe1d6", glow: "#ffb37a", star: .25 };
  const NOEGLER = [
    [0.00, GRY],
    [0.10, { top: "#5fb2ee", bot: "#d6f0ff", far: "#a9c6e6", snow: "#ffffff", mid: "#8cbccc", near: "#72bf8f",
      ground: "#5fb86a", grass: "#a9e38b", water: "#8fd0f0", cloud: "#ffffff", glow: "#fff3c4", star: 0 }],
    [0.45, { top: "#3f9fea", bot: "#c6eaff", far: "#9cbfe2", snow: "#ffffff", mid: "#7fb7c6", near: "#63b882",
      ground: "#55af62", grass: "#9fdf80", water: "#7cc8ee", cloud: "#ffffff", glow: "#fff6d0", star: 0 }],
    [0.60, { top: "#5d5aa8", bot: "#ffa47c", far: "#b98aae", snow: "#ffd9c9", mid: "#a87493", near: "#7f7f92",
      ground: "#6a8a63", grass: "#d2b974", water: "#efa595", cloud: "#ffc7b0", glow: "#ff9a5c", star: .05 }],
    [0.70, { top: "#262c62", bot: "#b0678f", far: "#66548c", snow: "#c9b5d8", mid: "#52477c", near: "#424d70",
      ground: "#34525a", grass: "#567a6e", water: "#6a5f9a", cloud: "#c7a3c4", glow: "#e07aa0", star: .6 }],
    [0.78, NAT],
    [0.93, NAT],
    [1.00, GRY],
  ].map(([t, o]) => { const c = { star: o.star }; for (const k in o) if (k !== "star") c[k] = hex(o[k]); return [t, c]; });
  function palette(t) {
    let i = 0; while (i < NOEGLER.length - 2 && NOEGLER[i + 1][0] <= t) i++;
    const [t0, a] = NOEGLER[i], [t1, b] = NOEGLER[i + 1], f = smooth(clamp((t - t0) / (t1 - t0), 0, 1)), p = {};
    for (const k in a) p[k] = k === "star" ? lerp(a.star, b.star, f) : mix(a[k], b[k], f);
    return p;
  }

  /* ---------- Landskabet ---------- */
  const SEG = 16, RAEKKE = ["eng", "skov", "eng", "soe"]; // biomer på skift langs vejen
  const segType = x => RAEKKE[((Math.floor(x / SEG) % 4) + 4) % 4];
  function biomeW(x, type) { // 0..1: hvor meget x ligger i biomet (blødt skift ved kanterne)
    const i = Math.floor(x / SEG), local = x - i * SEG, f = smooth(clamp((local - (SEG - 3)) / 3, 0, 1));
    const a = segType(i * SEG) === type ? 1 : 0, b = segType((i + 1) * SEG) === type ? 1 : 0;
    return a * (1 - f) + b * f;
  }
  const WY = 0.87; // vandets overflade (andel af højden)
  const groundY = x => lerp(0.84 - 0.025 * Math.sin(x * 1.3) - 0.012 * Math.sin(x * 3.7 + 1), 0.96, smooth(biomeW(x, "soe")));
  const isWater = x => groundY(x) > WY + 0.008;
  const tri = t => 1 - 2 * Math.abs(t - Math.floor(t) - .5); // spidse toppe
  const farY = X => 0.6 - 0.17 * tri(X * 1.6) * (.6 + .4 * Math.sin(X * .9)) - 0.07 * tri(X * 3.7 + .3) - 0.008 * Math.sin(X * 31);
  const midY = X => 0.665 - 0.04 * Math.sin(X * 4.1 + 2) - 0.025 * Math.sin(X * 9.3) - 0.008 * Math.sin(X * 23);
  const nearY = X => 0.755 - 0.03 * Math.sin(X * 3.3 + 0.5) - 0.018 * Math.sin(X * 7.9);

  const DYR = { // emoji, lydnøgle (er-<dyr>), har rigtig dyrelyd (dyr-<dyr>)
    eng: [["🐄", "ko", 1, "en ko"], ["🐑", "faar", 1, "et får"], ["🐎", "hest", 1, "en hest"], ["🐖", "gris", 1, "en gris"], ["🐔", "hoene", 1, "en høne"]],
    skov: [["🐻", "bjoern", 0, "en bjørn"], ["🦉", "ugle", 1, "en ugle"], ["🐁", "mus", 1, "en mus"]],
    vand: [["🦆", "and", 1, "en and"], ["🐸", "froe", 1, "en frø"]],
  };
  const BLOMST = ["#ff6b8b", "#ffd23f", "#b388ff", "#ff9f43", "#ffffff", "#5ec8ff", "#ff7ad9"];
  const VENNER = [ // fuglevenner: krop, mave, vinge
    ["#5fb4ff", "#e3f3ff", "#3f8fe0"], ["#7fd36b", "#ecffe0", "#4fae45"],
    ["#ff8fc8", "#ffe6f3", "#e5609f"], ["#ffd84a", "#fff7d6", "#f0b400"]];
  const MIG = ["#ff8a5b", "#ffe6c8", "#ef5f3c"];
  const TONER = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760, 2093];
  const DAG = 210; // sekunder for et helt døgn
  const RUNDE = 10; // frø pr. ny ven

  Spil.css("css-fuglen", `
    .fu{position:absolute;inset:0;overflow:hidden;background:#9fd8f5;touch-action:none}
    .fu canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .fu-hud{position:absolute;z-index:5;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      display:flex;gap:clamp(4px,.9vmin,9px);padding:clamp(8px,1.4vmin,13px) clamp(12px,2vmin,18px);border-radius:999px;
      background:rgba(255,255,255,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);pointer-events:none;
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
    .fu-hud i{width:clamp(11px,2vmin,20px);aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.38);transition:background .3s,box-shadow .3s,transform .3s}
    .fu-hud i.on{background:#ffe066;box-shadow:0 0 10px 2px rgba(255,214,80,.85);transform:scale(1.15)}
    @media (max-aspect-ratio:1/1){.fu-hud{gap:3px}.fu-hud i{width:clamp(9px,2.6vmin,15px)}}
  `);

  let root, cv, g, hud, alive, raf, timers, W, H, S, dpr, last, time;
  let cam, speed, dayT, bird, holding, pointerId, targetY, history, seeds, plants, falling, animals, parts,
    clouds, friends, combo, lastCollect, roundCount, totalSeeds, nextSpawn, nextAnimal, queue, countTalk,
    phase, said, lastTouch, hints, rainbow, rainFx, curSeg, stars, motes, nextCloud, audio;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

  /* ---------- Lyd ---------- */
  function startAudio() {
    try {
      const c = Spil.audio(); if (!c) return;
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < d.length; i++) { b = b * .96 + (Math.random() * 2 - 1) * .04; d[i] = b * 3.2; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = .6;
      const wind = c.createGain(); wind.gain.value = 0;
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
      const rain = c.createGain(); rain.gain.value = 0;
      src.connect(bp).connect(wind).connect(c.destination);
      src.connect(hp).connect(rain).connect(c.destination);
      // Et lille ekko gør klokketonerne bløde og drømmende
      const bus = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
      dl.delayTime.value = .27; fb.gain.value = .33; wet.gain.value = .45;
      bus.connect(c.destination); bus.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(c.destination);
      src.start();
      audio = { c, src, wind, rain, bus, nodes: [bp, hp, dl, fb, wet] };
    } catch (e) { audio = null; }
  }
  function stopAudio() {
    if (!audio) return;
    try { audio.src.stop(); } catch (e) {}
    try { [audio.wind, audio.rain, audio.bus, ...audio.nodes].forEach(n => n.disconnect()); } catch (e) {}
    audio = null;
  }
  function bell(freq, vol = .16, dur = 1.4) {
    if (!audio) return;
    try {
      const c = audio.c, t = c.currentTime;
      [[freq, "sine", vol], [freq * 2, "triangle", vol * .18]].forEach(([f, type, v]) => {
        const o = c.createOscillator(), gn = c.createGain();
        o.type = type; o.frequency.value = f;
        gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + .012);
        gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(gn).connect(audio.bus); o.start(t); o.stop(t + dur + .05);
      });
    } catch (e) {}
  }
  function chirp() {
    if (!audio) return;
    try {
      const c = audio.c, t = c.currentTime, f0 = 2300 + Math.random() * 500;
      for (let i = 0; i < 2; i++) {
        const o = c.createOscillator(), gn = c.createGain(), s = t + i * .09;
        o.type = "sine"; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * 1.45, s + .06);
        gn.gain.setValueAtTime(.0001, s); gn.gain.exponentialRampToValueAtTime(.07, s + .01); gn.gain.exponentialRampToValueAtTime(.0001, s + .08);
        o.connect(gn).connect(audio.bus); o.start(s); o.stop(s + .1);
      }
    } catch (e) {}
  }

  /* ---------- Stemme: en lille kø, så replikker ikke afbryder hinanden ---------- */
  function line(key, text) { if (!queue.some(q => q[0] === key)) queue.push([key, text]); }
  function once(key, text) { if (!said[key]) { said[key] = 1; line(key, text); } }
  function pumpVoice() {
    if (queue.length && !Spil.isTalking()) { const [k, t] = queue.shift(); countTalk = false; Spil.say(t, null, k); }
  }
  function count(n) {
    if (Spil.isTalking() && !countTalk) return; // en vigtig replik taler: klokken er nok
    countTalk = true; Spil.say(String(n), () => { countTalk = false; }, "tal-" + n);
  }

  /* ---------- Opsætning ---------- */
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    S = Math.min(H, W * 1.6);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const VW = () => W / S;              // synlig bredde i verdens-enheder
  const birdX = () => cam + (W < H ? 0.27 : 0.3) * VW();
  const sx = x => (x - cam) * S;        // verden → skærm (forgrunden)

  function spawnGroup(x) {
    const n = 4 + (Math.random() * 3 | 0), dx = 0.2, type = Math.random();
    const base = Math.random() < 0.45 ? 0.4 : 0.22 + Math.random() * 0.36;
    for (let i = 0; i < n; i++) {
      const xi = x + i * dx; let y;
      if (type < 0.35) y = base + 0.07 * Math.sin(i * 0.9);
      else if (type < 0.65) y = base - 0.13 * Math.sin(i / (n - 1) * Math.PI) + 0.06;
      else if (type < 0.85) y = groundY(xi) - 0.11 - 0.05 * Math.sin(i / (n - 1) * Math.PI); // lavt ned over dyrene
      else y = 0.2 + 0.02 * i;
      seeds.push({ x: xi, y: clamp(y, 0.14, Math.min(groundY(xi), WY) - 0.08), ph: Math.random() * TAU, got: 0 });
    }
    return n * dx;
  }
  function spawnAnimal(x) {
    const water = isWater(x), list = water ? DYR.vand : biomeW(x, "skov") > .5 ? DYR.skov : DYR.eng;
    // på søen: kun hvor der er vand; frøen sidder på en åkande
    const [e, k, lyd, navn] = list[Math.random() * list.length | 0];
    animals.push({ x, e, k, lyd, navn, water, heard: false, hop: 0, ph: Math.random() * TAU });
  }

  /* ---------- Opdatering ---------- */
  function collect(s) {
    s.got = 1;
    const now = time;
    combo = now - lastCollect < 1.3 ? Math.min(combo + 1, TONER.length - 1) : 0;
    lastCollect = now;
    bell(TONER[combo], .15);
    for (let i = 0; i < (still ? 5 : 12); i++) {
      const a = Math.random() * TAU, v = .15 + Math.random() * .35;
      parts.push({ k: "glimt", x: s.x, y: s.y, vx: Math.cos(a) * v * .6 + speed * .5, vy: Math.sin(a) * v * .5, life: 0, max: .6 + Math.random() * .5, r: .008 + Math.random() * .012 });
    }
    falling.push({ x: s.x, y: s.y, vy: 0, vx: speed * .95, ph: Math.random() * TAU }); // flyver med frem, så blomsten gror på skærmen
    totalSeeds++; roundCount++;
    renderHud(roundCount);
    if (roundCount >= RUNDE) {
      roundCount = 0;
      later(() => renderHud(roundCount), 1500);
      count(RUNDE);
      later(() => {
        if (friends.length < VENNER.length) {
          friends.push({ c: VENNER[friends.length], join: 0, off: (friends.length % 2 ? 1 : -1) * (0.05 + 0.02 * friends.length), ph: Math.random() * TAU });
          Spil.sfx.fanfare();
          line(friends.length === VENNER.length ? "fugl-alle" : "fugl-ven",
            friends.length === VENNER.length ? "Nu er vi fem fugle! Hvor er vi mange!" : "En ny ven! Nu flyver vi sammen!");
        } else { // alle venner er med: så kommer der en regnbue i stedet
          rainbow = Math.max(rainbow, 18); Spil.sfx.fanfare(); line("fugl-regnbue", "Se, en regnbue!");
          plants.forEach(p => { p.big = Math.min(1.6, p.big + .25); });
        }
      }, 700);
    } else count(roundCount);
  }

  function plant(x, water) {
    const forest = biomeW(x, "skov") > .5;
    const kind = water ? "aakande" : forest ? (Math.random() < .5 ? "svamp" : "busk") : ["tulipan", "margerit", "solsikke", "tulipan", "margerit"][Math.random() * 5 | 0];
    plants.push({ x, kind, col: hex(BLOMST[Math.random() * BLOMST.length | 0]), grow: 0, big: .85 + Math.random() * .3, ph: Math.random() * TAU });
    if (audio) bell(TONER[Math.random() * 3 | 0] / 2, .09, 1.1);
    for (let i = 0; i < (still ? 3 : 7); i++)
      parts.push({ k: "glimt", x: x + (Math.random() - .5) * .06, y: (water ? WY : groundY(x)) - .01, vx: (Math.random() - .5) * .1, vy: -.1 - Math.random() * .15, life: 0, max: .7, r: .006 + Math.random() * .008 });
    once("fugl-gror", "Se! Frøet blev til en blomst!");
  }

  function update(dt) {
    time += dt;
    dayT = (dayT + dt / DAG) % 1;
    const vw = VW();

    // fuglen: følger fingeren blødt; uden finger svæver den roligt i "cruise"-højde
    const cruise = 0.4 + 0.035 * Math.sin(time * 0.55);
    const tgt = holding ? targetY : cruise, rate = holding ? 3.4 : 0.7;
    const want = clamp((tgt - bird.y) * rate, -1.1, 1.1);
    bird.vy = lerp(bird.vy, want, 1 - Math.exp(-dt * 6));
    bird.y += bird.vy * dt;
    const bx = birdX(), floor = Math.min(groundY(bx), isWater(bx) ? WY : 1) - 0.065, top = 0.1;
    if (bird.y > floor) { bird.y = floor; bird.vy = Math.min(bird.vy, 0); }
    if (bird.y < top) { bird.y = top; bird.vy = Math.max(bird.vy, 0); }
    bird.ang = lerp(bird.ang, clamp(bird.vy * 0.9, -0.55, 0.55), 1 - Math.exp(-dt * 8));
    if (bird.vy < -0.12) bird.flap = Math.min(1, bird.flap + dt * 5);
    bird.flap = Math.max(0, bird.flap - dt * 0.9);
    if (!holding && Math.random() < dt * 0.25) bird.flap = Math.max(bird.flap, .6); // et par vingeslag nu og da
    bird.wing += dt * (3 + 13 * bird.flap);
    if (Math.random() < dt * .3) bird.blink = .14;
    bird.blink = Math.max(0, bird.blink - dt);

    // fart: lidt hurtigere, når man dykker
    const goal = 0.34 * (1 + clamp(bird.vy, 0, 1) * 0.7);
    speed = lerp(speed, goal, 1 - Math.exp(-dt * 2));
    cam += speed * dt;

    history.push({ t: time, x: bx, y: bird.y });
    while (history.length && history[0].t < time - 2.4) history.shift();

    // nye frø, dyr og regnskyer foran fuglen
    while (nextSpawn < cam + vw + 1.2) nextSpawn += spawnGroup(nextSpawn) + 0.9 + Math.random() * 1.6;
    while (nextAnimal < cam + vw + 1) { spawnAnimal(nextAnimal); nextAnimal += 2.2 + Math.random() * 3; }
    while (nextCloud < cam + vw + 1.5) { clouds.push({ x: nextCloud, y: 0.27 + Math.random() * .08, hit: false, seen: false }); nextCloud += 40 + Math.random() * 14; }

    seeds.forEach(s => {
      if (s.got) return;
      const dx = (s.x - bx) * S, dy = (s.y - bird.y) * H;
      if (dx * dx + dy * dy < (0.085 * S) ** 2) collect(s);
    });
    seeds = seeds.filter(s => !s.got && s.x > cam - 1);

    falling.forEach(f => {
      f.vy = Math.min(f.vy + dt * .7, .45); f.y += f.vy * dt; f.vx *= Math.pow(.6, dt); f.x += (f.vx + Math.sin(time * 3 + f.ph) * .05) * dt;
      const water = isWater(f.x), gy = water ? WY : groundY(f.x);
      if (f.y >= gy - .004) { f.done = 1; plant(f.x, water); }
    });
    falling = falling.filter(f => !f.done);
    plants.forEach(p => { p.grow = Math.min(1, p.grow + dt * 1.1); });
    plants = plants.filter(p => p.x > cam - 1);

    // dyrene: flyv lavt forbi, så siger de noget
    animals.forEach(a => {
      a.hop = Math.max(0, a.hop - dt * 1.6);
      if (a.heard) return;
      const gy = a.water ? WY : groundY(a.x);
      if (Math.abs(a.x - bx) < 0.22 && bird.y > gy - 0.27) {
        a.heard = true; a.hop = 1;
        for (let i = 0; i < 3; i++) parts.push({ k: "hjerte", x: a.x + (i - 1) * .04, y: gy - .1, vx: speed * .6, vy: -.12 - i * .03, life: 0, max: 1.4, r: .03 });
        if (!Spil.isTalking() || countTalk) { countTalk = false; Spil.say("Det er " + a.navn + ".", null, a.lyd ? ["er-" + a.k, "dyr-" + a.k] : ["er-" + a.k]); }
      }
    });
    animals = animals.filter(a => a.x > cam - 1);

    // regnskyen
    clouds.forEach(c => {
      const dx = (c.x - bx) * S, dy = (c.y - bird.y) * H;
      if (!c.seen && c.x < cam + vw * .95) { c.seen = true; line("fugl-sky", "Se, en regnsky! Flyv ind i skyen!"); }
      if (!c.hit && Math.abs(dx) < .32 * S && Math.abs(dy) < .14 * S) {
        c.hit = true; c.rain = 7; rainbow = Math.max(rainbow, 26); bell(TONER[0], .12, 2); bell(TONER[4], .1, 2.4);
        line("fugl-regn", "Det regner! Nu vokser blomsterne!");
        later(() => line("fugl-regnbue", "Se, en regnbue!"), 3500);
      }
      if (c.rain > 0) {
        c.rain -= dt;
        for (let i = 0; i < (still ? 1 : 3); i++) if (Math.random() < dt * 40)
          parts.push({ k: "draabe", x: c.x + (Math.random() - .5) * .5, y: c.y + .05, vx: 0, vy: .9, life: 0, max: 2, r: 0 });
        if (Math.random() < dt * 2.4) { const x = c.x + (Math.random() - .5) * .5; plant(x, isWater(x)); }
        plants.forEach(p => { if (Math.abs(p.x - c.x) < .3) p.big = Math.min(1.6, p.big + dt * .15); });
      }
    });
    clouds = clouds.filter(c => c.x > cam - 2);
    rainbow = Math.max(0, rainbow - dt);
    rainFx = clouds.some(c => c.rain > 0 && c.x > cam - .3) ? 1 : 0;

    // partikler
    parts.forEach(p => {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === "glimt") { p.vy += dt * .05; }
      if (p.k === "draabe" && p.y > Math.min(groundY(p.x), WY)) p.life = p.max;
      if (p.k === "roeg") { p.vy *= .99; p.r += dt * .012; }
    });
    parts = parts.filter(p => p.life < p.max);

    friends.forEach(f => { f.join = Math.min(1, f.join + dt * .45); });
    motes.forEach(m => { m.x -= dt * speed * S / W * (.3 + m.d * .4); if (m.x < -.03) m.x += 1.06; });

    // døgnet og stedet: stemmen fortæller, når noget skifter
    const ph = dayT < 0.06 ? "morgen" : dayT < 0.56 ? "dag" : dayT < 0.68 ? "aften" : dayT < 0.95 ? "nat" : "morgen";
    if (ph !== phase) {
      if (ph === "aften") line("fugl-aften", "Nu går solen ned. Hvor er det smukt!");
      if (ph === "nat") line("fugl-nat", "Godnat, sol. Se alle stjernerne!");
      if (ph === "morgen") line("fugl-morgen", "Godmorgen! Solen står op igen.");
      phase = ph;
    }
    const seg = segType(bx);
    if (seg !== curSeg) {
      if (seg === "skov") once("fugl-skov", "Nu flyver vi over skoven.");
      if (seg === "soe") once("fugl-vand", "Se, vi flyver over vandet!");
      curSeg = seg;
    }
    if (time - lastTouch > 22 && hints < 2 && !Spil.isTalking()) { hints++; lastTouch = time; line("fugl-hint", "Sæt fingeren på skærmen, så flyver fuglen derhen!"); }
    pumpVoice();

    if (audio) {
      try {
        const t = audio.c.currentTime;
        audio.wind.gain.setTargetAtTime(Math.max(0, .012 + clamp(Math.abs(bird.vy), 0, 1) * .03 + (speed - .34) * .08), t, .3);
        audio.rain.gain.setTargetAtTime(rainFx ? .028 : 0, t, .6);
      } catch (e) {}
    }
  }

  /* ---------- Tegning ---------- */
  function ridge(par, fn, c1, c2, step = 6) {
    const off = cam * par;
    let minY = H;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) { const y = fn(off + x / S) * H; if (y < minY) minY = y; g.lineTo(x, y); }
    g.lineTo(W, H); g.closePath();
    const gr = g.createLinearGradient(0, minY, 0, H); gr.addColorStop(0, rgb(c1)); gr.addColorStop(1, rgb(c2));
    g.fillStyle = gr; g.fill();
  }
  function haze(y0, y1, col, a) {
    const gr = g.createLinearGradient(0, y0 * H, 0, y1 * H);
    gr.addColorStop(0, rgb(col, 0)); gr.addColorStop(1, rgb(col, a));
    g.fillStyle = gr; g.fillRect(0, y0 * H, W, (y1 - y0) * H);
  }
  function puff(x, y, s, col, shade) {
    const c = [[0, 0, .42], [-.42, .12, .3], [.42, .1, .33], [.16, -.16, .34], [-.2, -.08, .3]];
    g.fillStyle = rgb(shade);
    g.beginPath(); c.forEach(([a, b, r]) => { g.moveTo(x + a * s + r * s, y + b * s + s * .07); g.arc(x + a * s, y + b * s + s * .07, r * s, 0, TAU); }); g.fill();
    g.fillStyle = rgb(col);
    g.beginPath(); c.forEach(([a, b, r]) => { g.moveTo(x + a * s + r * s, y + b * s); g.arc(x + a * s, y + b * s, r * s, 0, TAU); }); g.fill();
  }
  function cloudLayer(par, spacing, salt, yMin, yRange, sMin, P, alpha) {
    const off = cam * par + time * .004 * (1 + salt);
    const k0 = Math.floor(off / spacing) - 1, k1 = Math.ceil((off + VW()) / spacing) + 1;
    g.globalAlpha = alpha;
    for (let k = k0; k <= k1; k++) {
      if (hash(k + salt * 91) > .62) continue;
      const X = k * spacing + hash(k * 3 + salt) * spacing * .5;
      const s = (sMin + hash(k * 7 + salt) * sMin) * S;
      puff((X - off) * S, (yMin + hash(k * 5 + salt) * yRange) * H, s, P.cloud, mix(P.cloud, P.bot, .45));
    }
    g.globalAlpha = 1;
  }

  function drawSky(P) {
    const gr = g.createLinearGradient(0, 0, 0, H * .75);
    gr.addColorStop(0, rgb(P.top)); gr.addColorStop(1, rgb(P.bot));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // stjerner
    if (P.star > .01) {
      stars.forEach(s => {
        const tw = still ? 1 : .6 + .4 * Math.sin(time * s.sp + s.ph);
        g.fillStyle = `rgba(255,255,240,${P.star * tw * s.a})`;
        g.beginPath(); g.arc(s.x * W, s.y * H, s.r * Math.max(1, S / 700), 0, TAU); g.fill();
      });
    }
    const hor = 0.6 * H;
    // solen
    if (dayT < 0.7) {
      const p = dayT / 0.7, x = lerp(.1, .9, p) * W, y = hor - Math.sin(p * Math.PI) * .48 * H;
      const gl = g.createRadialGradient(x, y, 0, x, y, S * .55);
      gl.addColorStop(0, rgb(P.glow, .7)); gl.addColorStop(.25, rgb(P.glow, .25)); gl.addColorStop(1, rgb(P.glow, 0));
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(255,250,228,.96)"; g.beginPath(); g.arc(x, y, S * .055, 0, TAU); g.fill();
    }
    // månen
    const mp = dayT > 0.64 ? (dayT - 0.64) / 0.4 : dayT < 0.04 ? (dayT + 0.36) / 0.4 : -1;
    if (mp >= 0) {
      const x = lerp(.15, .85, mp) * W, y = hor - Math.sin(mp * Math.PI) * .45 * H, r = S * .042;
      const gl = g.createRadialGradient(x, y, 0, x, y, r * 6);
      gl.addColorStop(0, "rgba(220,230,255,.35)"); gl.addColorStop(1, "rgba(220,230,255,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 6, 0, TAU); g.fill();
      g.fillStyle = "#f4f1e0"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = "rgba(200,196,175,.5)";
      [[-.3, -.2, .22], [.25, .2, .16], [.1, -.35, .1]].forEach(([a, b, c]) => { g.beginPath(); g.arc(x + a * r, y + b * r, c * r, 0, TAU); g.fill(); });
    }
    // regnbuen
    if (rainbow > 0) {
      const a = Math.min(1, rainbow / 3, (26 - Math.min(26, rainbow)) * 2 + .001) * .42;
      const cx = W * .62, cy = H * .7, R = Math.max(W, H) * .5, bw = R * .028;
      ["#ff5a5a", "#ff9f43", "#ffe066", "#7bd67b", "#5ec8ff", "#6c7bff", "#b17bff"].forEach((c, i) => {
        g.strokeStyle = c; g.globalAlpha = a; g.lineWidth = bw;
        g.beginPath(); g.arc(cx, cy, R - i * bw, Math.PI, TAU); g.stroke();
      });
      g.globalAlpha = 1;
    }
  }

  function drawLand(P) {
    cloudLayer(.03, .9, 1, .07, .2, .07, P, .75);
    // bjerge med sne
    const offF = cam * .06;
    ridge(.06, farY, P.far, mix(P.far, P.bot, .35));
    const snowL = x => (.465 + .007 * Math.sin(x * .06 + offF * 40)) * H;
    g.beginPath(); g.moveTo(0, snowL(0));
    for (let x = 0; x <= W + 6; x += 6) g.lineTo(x, Math.min(farY(offF + x / S) * H, snowL(x)));
    for (let x = Math.ceil((W + 6) / 6) * 6; x >= 0; x -= 6) g.lineTo(x, snowL(x));
    g.closePath(); g.fillStyle = rgb(P.snow, .92); g.fill();
    haze(.42, .66, P.bot, .45);
    cloudLayer(.12, 1.1, 2, .16, .2, .1, P, .9);
    // mellemste bakker med grantræer
    const offM = cam * .18;
    ridge(.18, midY, P.mid, mix(P.mid, P.bot, .25));
    g.fillStyle = rgb(P.mid);
    const k0 = Math.floor(offM / .05), k1 = k0 + Math.ceil(VW() / .05) + 2;
    g.beginPath();
    for (let k = k0; k <= k1; k++) {
      if (hash(k) > .35 + .35 * Math.sin(k * .07)) continue;
      const X = k * .05, x = (X - offM) * S, y = midY(X) * H + 2, h = (.03 + hash(k + 9) * .025) * H;
      g.moveTo(x - h * .28, y); g.lineTo(x, y - h); g.lineTo(x + h * .28, y);
    }
    g.fill();
    haze(.55, .78, P.bot, .3);
    // nære bakker med runde træer
    const offN = cam * .4;
    ridge(.4, nearY, P.near, mix(P.near, P.ground, .5));
    const t0 = Math.floor(offN / .09), t1 = t0 + Math.ceil(VW() / .09) + 2;
    for (let k = t0; k <= t1; k++) {
      if (hash(k + 3) > .3) continue;
      const X = k * .09 + hash(k) * .05, x = (X - offN) * S, y = nearY(X) * H + 3, r = (.022 + hash(k + 1) * .014) * H;
      g.fillStyle = rgb(mix(P.near, [40, 60, 50], .25));
      g.beginPath(); g.arc(x, y - r * .9, r, 0, TAU); g.arc(x - r * .7, y - r * .5, r * .7, 0, TAU); g.arc(x + r * .7, y - r * .5, r * .75, 0, TAU); g.fill();
      g.fillStyle = rgb(mix(P.near, P.grass, .35));
      g.beginPath(); g.arc(x - r * .25, y - r * 1.15, r * .45, 0, TAU); g.fill();
    }
    haze(.66, .86, P.bot, .14);
  }

  function drawWater(P) {
    const y = WY * H;
    const gr = g.createLinearGradient(0, y, 0, H);
    gr.addColorStop(0, rgb(mix(P.water, P.bot, .35))); gr.addColorStop(1, rgb(mix(P.water, P.top, .4)));
    g.fillStyle = gr; g.fillRect(0, y, W, H - y);
    // glimmer på vandet
    g.strokeStyle = rgb(mix(P.water, [255, 255, 255], .6), .55); g.lineWidth = Math.max(1, S * .003);
    for (let i = 0; i < 26; i++) {
      const yy = y + (3 + hash(i) * (H - y - 4)), len = (.02 + hash(i + 4) * .05) * S;
      const xx = ((hash(i + 8) * W * 1.3 - cam * S * (.25 + hash(i) * .4) + Math.sin(time + i) * 6) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * .15;
      g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + len, yy); g.stroke();
    }
  }

  function drawGround(P) {
    const step = 5;
    let minY = H;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) { const y = groundY(cam + x / S) * H; if (y < minY) minY = y; g.lineTo(x, y); }
    g.lineTo(W, H); g.closePath();
    const gr = g.createLinearGradient(0, minY, 0, H);
    gr.addColorStop(0, rgb(P.grass)); gr.addColorStop(.18, rgb(P.ground)); gr.addColorStop(1, rgb(mix(P.ground, P.top, .3)));
    g.fillStyle = gr; g.fill();
    // græstotter
    g.strokeStyle = rgb(mix(P.grass, [255, 255, 255], .15)); g.lineWidth = Math.max(1.5, S * .004); g.lineCap = "round";
    const k0 = Math.floor(cam / .045), k1 = k0 + Math.ceil(VW() / .045) + 2;
    g.beginPath();
    for (let k = k0; k <= k1; k++) {
      if (hash(k + 17) > .45) continue;
      const X = k * .045 + hash(k) * .03; if (isWater(X)) continue;
      const x = (X - cam) * S, y = groundY(X) * H + 2, h = (.012 + hash(k + 2) * .012) * S;
      const sw = still ? 0 : Math.sin(time * 2 + X * 5) * h * .25;
      g.moveTo(x - h * .3, y); g.lineTo(x - h * .4 + sw, y - h * .8);
      g.moveTo(x, y); g.lineTo(x + sw, y - h);
      g.moveTo(x + h * .3, y); g.lineTo(x + h * .45 + sw, y - h * .75);
    }
    g.stroke();
    // siv ved søbredden
    const r0 = Math.floor(cam / .03), r1 = r0 + Math.ceil(VW() / .03) + 2;
    for (let k = r0; k <= r1; k++) {
      const X = k * .03, lw = biomeW(X, "soe");
      if (lw < .12 || lw > .7 || isWater(X) || hash(k + 5) > .6) continue;
      const x = (X - cam) * S, y = groundY(X) * H + 3, h = (.05 + hash(k) * .04) * S, sw = still ? 0 : Math.sin(time * 1.6 + X * 4) * h * .08;
      g.strokeStyle = rgb(mix(P.grass, P.ground, .4)); g.lineWidth = Math.max(1.5, S * .004);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x, y - h * .6, x + sw, y - h); g.stroke();
      g.fillStyle = rgb(mix([120, 72, 40], P.top, P.star * .6));
      g.beginPath(); g.ellipse(x + sw * .9, y - h * .9, S * .006, h * .14, 0, 0, TAU); g.fill();
    }
    // et rødt hus på engen nu og da
    const h0 = Math.floor(cam / 9) - 1, h1 = h0 + Math.ceil(VW() / 9) + 2;
    for (let k = h0; k <= h1; k++) {
      const X = k * 9 + 4.5;
      if (biomeW(X, "eng") < .95 || hash(k + 40) > .7) continue;
      drawHouse((X - cam) * S, groundY(X) * H + 3, .1 * S, P, k);
    }
    // grantræer i skoven
    const f0 = Math.floor(cam / .16) - 1, f1 = f0 + Math.ceil(VW() / .16) + 3;
    for (let k = f0; k <= f1; k++) {
      const X = k * .16 + hash(k + 2) * .08, fw = biomeW(X, "skov");
      if (fw * (.3 + hash(k + 11) * .7) < .3) continue;
      const x = (X - cam) * S, y = groundY(X) * H + 3, h = (.13 + hash(k + 6) * .09) * H * Math.min(1, fw * 1.4);
      g.fillStyle = rgb(mix([110, 75, 50], P.top, P.star * .5)); g.fillRect(x - h * .03, y - h * .2, h * .06, h * .2);
      const dark = mix(mix(P.near, [30, 80, 60], .45), P.top, P.star * .3), light = mix(dark, P.grass, .35);
      for (let i = 0; i < 3; i++) {
        const ty = y - h * (.15 + i * .26), tw = h * (.32 - i * .07);
        g.fillStyle = rgb(dark); g.beginPath(); g.moveTo(x - tw, ty); g.lineTo(x, ty - h * .42); g.lineTo(x + tw, ty); g.closePath(); g.fill();
        g.fillStyle = rgb(light, .55); g.beginPath(); g.moveTo(x - tw * .2, ty - h * .1); g.lineTo(x, ty - h * .42); g.lineTo(x - tw * .55, ty - h * .03); g.closePath(); g.fill();
      }
    }
    // åkander pynter søen
    const l0 = Math.floor(cam / .22), l1 = l0 + Math.ceil(VW() / .22) + 2;
    for (let k = l0; k <= l1; k++) {
      const X = k * .22 + hash(k + 1) * .1;
      if (!isWater(X) || hash(k + 23) > .45) continue;
      lilyPad((X - cam) * S, WY * H + (2 + hash(k) * .03 * H), S * (.03 + hash(k + 3) * .02), P, null);
    }
  }
  function drawHouse(x, y, s, P, k) {
    const night = P.star, wall = mix([206, 72, 60], P.top, night * .55), roof = mix([92, 58, 58], P.top, night * .5);
    g.fillStyle = rgb(wall); g.fillRect(x - s * .5, y - s * .5, s, s * .5);
    g.fillStyle = rgb(roof); g.beginPath(); g.moveTo(x - s * .62, y - s * .48); g.lineTo(x, y - s * .9); g.lineTo(x + s * .62, y - s * .48); g.closePath(); g.fill();
    g.fillRect(x + s * .22, y - s * .88, s * .1, s * .25); // skorsten
    g.fillStyle = rgb(mix([250, 245, 235], P.top, night * .5)); g.fillRect(x - s * .08, y - s * .28, s * .16, s * .28); // dør
    const lit = night > .3;
    g.fillStyle = lit ? `rgba(255,214,110,${.6 + night * .4})` : rgb(mix([250, 250, 255], P.top, night * .5));
    g.fillRect(x - s * .4, y - s * .4, s * .2, s * .16); g.fillRect(x + s * .2, y - s * .4, s * .2, s * .16);
    if (lit) {
      const gl = g.createRadialGradient(x, y - s * .32, 0, x, y - s * .32, s * 1.1);
      gl.addColorStop(0, `rgba(255,210,120,${night * .3})`); gl.addColorStop(1, "rgba(255,210,120,0)");
      g.fillStyle = gl; g.fillRect(x - s * 1.1, y - s * 1.4, s * 2.2, s * 2.2);
    }
    if (!still && Math.random() < .03) parts.push({ k: "roeg", x: cam + (x + s * .27) / S, y: (y - s * .9) / H, vx: .02, vy: -.04, life: 0, max: 3, r: .012 });
  }
  function lilyPad(x, y, r, P, flower) {
    g.fillStyle = rgb(mix([84, 170, 96], P.top, P.star * .5));
    g.beginPath(); g.ellipse(x, y, r, r * .36, 0, .25, TAU - .25); g.lineTo(x, y); g.closePath(); g.fill();
    if (flower) {
      const c = mix(flower, P.top, P.star * .3);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        g.fillStyle = rgb(mix(c, [255, 255, 255], i % 2 ? .3 : 0));
        g.beginPath(); g.ellipse(x + Math.cos(a) * r * .28, y - r * .18 + Math.sin(a) * r * .1, r * .26, r * .13, a, 0, TAU); g.fill();
      }
      g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(x, y - r * .2, r * .12, 0, TAU); g.fill();
    }
  }

  function drawPlant(p, P) {
    const water = p.kind === "aakande", gy = (water ? WY : groundY(p.x)) * H + 2, x = sx(p.x);
    if (x < -60 || x > W + 60) return;
    const sz = .075 * S * p.big * Math.max(0, backOut(p.grow)), night = P.star;
    if (sz < .5) return;
    const col = mix(p.col, P.top, night * .35), stem = mix([74, 156, 76], P.top, night * .5);
    if (water) return lilyPad(x, gy, sz * .6, P, p.col);
    g.save(); g.translate(x, gy); g.rotate(still ? 0 : Math.sin(time * 1.5 + p.ph) * .07);
    g.strokeStyle = rgb(stem); g.lineCap = "round"; g.lineWidth = Math.max(2, sz * .07);
    if (p.kind === "svamp") {
      g.fillStyle = rgb(mix([250, 240, 220], P.top, night * .4)); g.fillRect(-sz * .1, -sz * .4, sz * .2, sz * .4);
      g.fillStyle = rgb(mix([230, 60, 60], P.top, night * .4)); g.beginPath(); g.ellipse(0, -sz * .4, sz * .32, sz * .24, 0, Math.PI, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.9)";
      [[-.15, -.5, .05], [.1, -.55, .06], [.2, -.45, .04]].forEach(([a, b, c]) => { g.beginPath(); g.arc(a * sz, b * sz, c * sz, 0, TAU); g.fill(); });
    } else if (p.kind === "busk") {
      const c = mix(mix(P.grass, [60, 140, 80], .4), P.top, night * .3);
      g.fillStyle = rgb(c); g.beginPath(); g.arc(0, -sz * .3, sz * .3, 0, TAU); g.arc(-sz * .25, -sz * .15, sz * .2, 0, TAU); g.arc(sz * .25, -sz * .15, sz * .22, 0, TAU); g.fill();
      g.fillStyle = rgb(col); [[-.12, -.4], [.14, -.3], [-.02, -.2]].forEach(([a, b]) => { g.beginPath(); g.arc(a * sz, b * sz, sz * .05, 0, TAU); g.fill(); });
    } else {
      const h = p.kind === "solsikke" ? sz * 1.25 : sz * .8;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sz * .06, -h * .5, 0, -h); g.stroke();
      g.fillStyle = rgb(stem); g.beginPath(); g.ellipse(sz * .12, -h * .35, sz * .14, sz * .05, -.6, 0, TAU); g.fill();
      if (p.kind === "tulipan") {
        g.fillStyle = rgb(col);
        g.beginPath(); g.moveTo(-sz * .18, -h - sz * .02); g.quadraticCurveTo(-sz * .2, -h + sz * .22, 0, -h + sz * .2);
        g.quadraticCurveTo(sz * .2, -h + sz * .22, sz * .18, -h - sz * .02); g.lineTo(sz * .09, -h - sz * .2); g.lineTo(0, -h - sz * .06);
        g.lineTo(-sz * .09, -h - sz * .2); g.closePath(); g.fill();
      } else {
        const sun = p.kind === "solsikke", pr = sun ? sz * .3 : sz * .22, pc = sun ? mix([255, 200, 40], P.top, night * .35) : col;
        g.fillStyle = rgb(pc);
        for (let i = 0; i < (sun ? 12 : 8); i++) {
          const a = i / (sun ? 12 : 8) * TAU + p.ph;
          g.beginPath(); g.ellipse(Math.cos(a) * pr * .6, -h + Math.sin(a) * pr * .6, pr * .45, pr * .2, a, 0, TAU); g.fill();
        }
        g.fillStyle = sun ? "#7a4a22" : "#ffd23f"; g.beginPath(); g.arc(0, -h, pr * (sun ? .42 : .3), 0, TAU); g.fill();
      }
    }
    g.restore();
  }

  function drawAnimal(a, P) {
    const x = sx(a.x); if (x < -80 || x > W + 80) return;
    const s = .085 * S, base = (a.water ? WY : groundY(a.x)) * H;
    const hop = Math.sin(a.hop * Math.PI) * .05 * S;
    const bob = a.water ? Math.sin(time * 2 + a.ph) * S * .004 : 0;
    if (a.water && a.k === "froe") lilyPad(x, base + 3, s * .55, P, null);
    g.font = `${s}px ${EMOJI}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillStyle = "rgba(0,0,0,.12)"; if (!a.water) { g.beginPath(); g.ellipse(x, base + 2, s * .38, s * .07, 0, 0, TAU); g.fill(); }
    g.fillStyle = "#000";
    g.fillText(a.e, x, base - hop + bob + (a.water ? s * .15 : s * .08));
  }

  function drawSeed(s, P) {
    const x = sx(s.x); if (x < -40 || x > W + 40) return;
    const y = (s.y + Math.sin(time * 2 + s.ph) * .012) * H, r = .03 * S, glow = 1 + P.star * .6;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.6 * glow);
    gr.addColorStop(0, "rgba(255,240,170,.85)"); gr.addColorStop(.35, "rgba(255,220,110,.35)"); gr.addColorStop(1, "rgba(255,220,110,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.6 * glow, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,255,255,.9)"; g.fillStyle = "rgba(255,255,255,.95)"; g.lineWidth = Math.max(1, r * .08);
    const rot = s.ph + (still ? 0 : time * .6);
    g.beginPath();
    for (let i = 0; i < 9; i++) { const a = rot + i / 9 * TAU; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.stroke();
    for (let i = 0; i < 9; i++) { const a = rot + i / 9 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .1, 0, TAU); g.fill(); }
    g.fillStyle = "#ffcf3a"; g.beginPath(); g.arc(x, y, r * .3, 0, TAU); g.fill();
  }

  function drawRainCloud(c, P) {
    const x = sx(c.x), y = c.y * H, s = .36 * S; if (x < -s * 2 || x > W + s * 2) return;
    const base = mix(mix(P.cloud, [120, 135, 170], .45), P.top, .1);
    puff(x, y, s, base, mix(base, [60, 70, 100], .35));
    if (c.hit) { g.globalAlpha = .5; puff(x - s * .1, y - s * .06, s * .7, mix(base, [255, 255, 255], .3), base); g.globalAlpha = 1; }
    // et lille smil, så skyen ser venlig ud
    g.strokeStyle = "rgba(40,50,80,.55)"; g.lineWidth = Math.max(2, s * .03); g.lineCap = "round";
    g.beginPath(); g.arc(x - s * .14, y + s * .02, s * .04, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(x + s * .14, y + s * .02, s * .04, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(x, y + s * .1, s * .08, .2 * Math.PI, .8 * Math.PI); g.stroke();
  }

  function drawBird(x, y, s, ang, wing, col, blink, night) {
    g.save(); g.translate(x, y); g.rotate(ang);
    if (night > .05) {
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
      gl.addColorStop(0, `rgba(255,230,180,${night * .35})`); gl.addColorStop(1, "rgba(255,230,180,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, s * 1.6, 0, TAU); g.fill();
    }
    const [body, belly, wcol] = col, w = Math.sin(wing);
    // hale
    g.fillStyle = wcol;
    g.beginPath(); g.moveTo(-s * .35, -s * .05); g.lineTo(-s * .8, -s * .24); g.quadraticCurveTo(-s * .68, -s * .02, -s * .78, s * .16); g.closePath(); g.fill();
    // bageste vinge
    g.save(); g.translate(s * .02, -s * .12); g.rotate(-.5 + w * .7);
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(-s * .2, 0, s * .28, s * .11, 0, 0, TAU); g.fill();
    g.fillStyle = wcol; g.globalAlpha = .75; g.beginPath(); g.ellipse(-s * .2, 0, s * .28, s * .11, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.restore();
    // krop og mave
    g.fillStyle = body; g.beginPath(); g.ellipse(0, 0, s * .48, s * .38, 0, 0, TAU); g.fill();
    g.fillStyle = belly; g.beginPath(); g.ellipse(s * .08, s * .13, s * .32, s * .2, -.1, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.28)"; g.beginPath(); g.ellipse(-s * .05, -s * .2, s * .22, s * .08, -.2, 0, TAU); g.fill();
    // kind, øje, næb
    g.fillStyle = "rgba(255,110,140,.45)"; g.beginPath(); g.arc(s * .22, s * .06, s * .07, 0, TAU); g.fill();
    if (blink > 0) { g.strokeStyle = "#1f2a44"; g.lineWidth = s * .035; g.beginPath(); g.moveTo(s * .2, -s * .08); g.lineTo(s * .32, -s * .08); g.stroke(); }
    else {
      g.fillStyle = "#1f2a44"; g.beginPath(); g.arc(s * .26, -s * .08, s * .068, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(s * .285, -s * .105, s * .024, 0, TAU); g.fill();
    }
    g.fillStyle = "#ffb02e"; g.beginPath(); g.moveTo(s * .43, -s * .07); g.lineTo(s * .66, -s * .01); g.lineTo(s * .43, s * .05); g.closePath(); g.fill();
    // forreste vinge
    g.save(); g.translate(-s * .04, -s * .04); g.rotate(-.3 + w * .85);
    g.fillStyle = wcol; g.beginPath(); g.ellipse(-s * .22, 0, s * .32, s * .14, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.ellipse(-s * .16, -s * .04, s * .18, s * .05, 0, 0, TAU); g.fill();
    g.restore();
    g.restore();
  }
  function histAt(t) {
    for (let i = history.length - 1; i >= 0; i--) if (history[i].t <= t) return history[i];
    return history[0];
  }

  function drawBirds(P) {
    const bxs = (W < H ? 0.27 : 0.3) * W, by = bird.y * H, s = .085 * S;
    // spejlbillede i søen
    if (isWater(birdX())) {
      const ry = 2 * WY * H - by, a = clamp(1 - (WY * H - by) / (H * .35), 0, 1) * .3;
      if (a > .01) {
        g.save(); g.beginPath(); g.rect(0, WY * H, W, H); g.clip();
        g.globalAlpha = a; g.translate(0, ry); g.scale(1, -1);
        drawBird(bxs, 0, s, bird.ang, bird.wing, MIG, 0, 0);
        g.restore(); g.globalAlpha = 1;
      }
    }
    // lysende hale-bånd bag fuglen
    const pts = history.filter(h => h.t > time - .75);
    if (pts.length > 2) {
      g.lineCap = "round";
      const c = P.star > .4 ? [190, 210, 255] : [255, 255, 255];
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length;
        g.strokeStyle = rgb(c, f * .5); g.lineWidth = f * s * .26;
        g.beginPath(); g.moveTo(sx(pts[i - 1].x) - s * .4, pts[i - 1].y * H); g.lineTo(sx(pts[i].x) - s * .4, pts[i].y * H); g.stroke();
      }
    }
    // vennerne flyver bagved
    friends.forEach((f, i) => {
      const h = histAt(time - .38 * (i + 1)), h2 = histAt(time - .38 * (i + 1) - .1);
      let x = sx(h.x) - s * .25, y = h.y * H + (f.off + Math.sin(time * 1.3 + f.ph) * .012) * S;
      const e = smooth(f.join);
      x = lerp(W + s * 2, x, e); y = lerp(H * .12, y, e);
      const ang = clamp((h.y - h2.y) * 9, -.5, .5) * e;
      drawBird(x, y, s * .72, ang, time * (6 + i) + f.ph + (1 - e) * time * 10, f.c, 0, P.star);
    });
    drawBird(bxs, by + (still ? 0 : Math.sin(time * 2.2) * S * .004), s, bird.ang, bird.wing, MIG, bird.blink, P.star);
  }

  function drawParts(P) {
    parts.forEach(p => {
      const x = sx(p.x), y = p.y * H, f = p.life / p.max;
      if (p.k === "glimt") {
        const r = p.r * S * (1 - f * .6);
        g.fillStyle = `rgba(255,240,170,${1 - f})`;
        g.beginPath(); g.moveTo(x, y - r * 2); g.quadraticCurveTo(x, y, x + r * 2, y); g.quadraticCurveTo(x, y, x, y + r * 2);
        g.quadraticCurveTo(x, y, x - r * 2, y); g.quadraticCurveTo(x, y, x, y - r * 2); g.fill();
      } else if (p.k === "hjerte") {
        g.globalAlpha = 1 - f; g.font = `${p.r * S}px ${EMOJI}`; g.textAlign = "center"; g.fillText("💛", x, y); g.globalAlpha = 1;
      } else if (p.k === "draabe") {
        g.strokeStyle = "rgba(190,220,255,.75)"; g.lineWidth = Math.max(1.5, S * .003);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + S * .025); g.stroke();
      } else if (p.k === "roeg") {
        g.fillStyle = rgb(mix([240, 240, 245], P.top, P.star * .6), .4 * (1 - f));
        g.beginPath(); g.arc(x, y, p.r * S, 0, TAU); g.fill();
      }
    });
    // svævende fnug om dagen, ildfluer om natten
    motes.forEach(m => {
      const x = m.x * W, y = (m.y + Math.sin(time * m.sp + m.ph) * .02) * H;
      if (P.star > .3 && m.y > .5) {
        const a = P.star * (.5 + .5 * Math.sin(time * 2.5 + m.ph)), r = S * .02;
        const gl = g.createRadialGradient(x, y, 0, x, y, r);
        gl.addColorStop(0, `rgba(220,255,140,${a})`); gl.addColorStop(1, "rgba(220,255,140,0)");
        g.fillStyle = gl; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      } else if (P.star < .5) {
        g.fillStyle = `rgba(255,255,255,${.35 * (1 - P.star * 2)})`;
        g.beginPath(); g.arc(x, y, S * .0035 * m.d, 0, TAU); g.fill();
      }
    });
    // vindstriber
    if (!still) {
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = Math.max(1, S * .002);
      for (let i = 0; i < 5; i++) {
        const span = W * 1.6, x = W * 1.3 - ((time * speed * S * 2.2 + hash(i) * span) % span), y = (.15 + hash(i + 3) * .5) * H, l = S * (.08 + hash(i + 7) * .1);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
      }
    }
  }

  function draw() {
    const P = palette(dayT);
    drawSky(P);
    drawLand(P);
    drawWater(P);
    drawGround(P);
    plants.forEach(p => drawPlant(p, P));
    animals.forEach(a => drawAnimal(a, P));
    falling.forEach(f => drawSeed({ x: f.x, y: f.y, ph: f.ph }, P));
    clouds.forEach(c => drawRainCloud(c, P));
    seeds.forEach(s => drawSeed(s, P));
    drawBirds(P);
    drawParts(P);
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  function renderHud(n) { [...hud.children].forEach((d, i) => d.classList.toggle("on", i < n)); }

  /* ---------- Fingeren ---------- */
  function down(e) {
    if (pointerId != null && e.pointerId !== pointerId) return;
    pointerId = e.pointerId; holding = true; targetY = e.clientY / H; lastTouch = time;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    bird.flap = 1; chirp();
  }
  function move(e) { if (holding && e.pointerId === pointerId) targetY = e.clientY / H; }
  function up(e) { if (e.pointerId === pointerId) { holding = false; pointerId = null; lastTouch = time; } }

  Spil.register({
    id: "fuglen", navn: "Fuglen", ikon: "🐦", farve: "#bfe3ff",
    start(r) {
      Spil.preload(["fugl-hej", "fugl-froe", "fugl-gror", "fugl-ven", "fugl-sky", "fugl-regn", "fugl-regnbue",
        "tal-1", "tal-2", "tal-3", "tal-4", "tal-5", "tal-6", "tal-7", "tal-8", "tal-9", "tal-10"]);
      alive = true; timers = [];
      r.innerHTML = `<div class="fu"><canvas aria-label="En lille fugl flyver over landskabet"></canvas><div class="fu-hud">${"<i></i>".repeat(RUNDE)}</div></div>`;
      root = r.querySelector(".fu"); cv = root.querySelector("canvas"); hud = root.querySelector(".fu-hud");
      g = cv.getContext("2d");
      resize(); addEventListener("resize", resize);
      cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move);
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

      time = 0; cam = 0; speed = .34; dayT = .12; last = performance.now();
      bird = { y: .4, vy: 0, ang: 0, flap: 0, wing: 0, blink: 0 };
      holding = false; pointerId = null; targetY = .4; history = [];
      seeds = []; plants = []; falling = []; animals = []; parts = []; clouds = []; friends = [];
      combo = 0; lastCollect = -9; roundCount = 0; totalSeeds = 0; queue = []; countTalk = false; said = {};
      nextSpawn = 1.1; nextAnimal = 1.6; nextCloud = 24; phase = "dag"; curSeg = "eng"; lastTouch = 0; hints = 0;
      rainbow = 0; rainFx = 0;
      stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * .55, r: .5 + Math.random() * 1.3, a: .4 + Math.random() * .6, ph: Math.random() * TAU, sp: 1 + Math.random() * 2 }));
      motes = Array.from({ length: still ? 10 : 26 }, () => ({ x: Math.random() * 1.05, y: .2 + Math.random() * .7, d: .5 + Math.random(), ph: Math.random() * TAU, sp: .5 + Math.random() }));
      // første frø ligger lige i fuglens flyvehøjde, så selv de mindste samler nogen
      for (let i = 0; i < 5; i++) seeds.push({ x: 1.1 + i * .2, y: .4 + .03 * Math.sin(i), ph: Math.random() * TAU, got: 0 });
      nextSpawn = 3;

      // dybe links til test
      const d = Spil.dyb;
      if (d === "aften") dayT = .55;
      if (d === "nat") { dayT = .76; phase = "nat"; }
      if (d === "regn") nextCloud = 1.6;
      if (d === "venner") friends = VENNER.map((c, i) => ({ c, join: 1, off: (i % 2 ? 1 : -1) * (0.05 + 0.02 * (i + 1)), ph: i }));
      if (d === "skov") { cam = SEG - 1; curSeg = "skov"; nextSpawn = cam + 2; nextAnimal = cam + 1.4; nextCloud = cam + 24; seeds.forEach(s => s.x += cam); }
      if (d === "soe") { cam = SEG * 3 - .6; curSeg = "soe"; nextSpawn = cam + 2; nextAnimal = cam + 1.4; nextCloud = cam + 24; seeds.forEach(s => s.x += cam); }

      startAudio();
      later(() => { line("fugl-hej", "Hej! Jeg er en lille fugl. Sæt fingeren på skærmen, så flyver jeg derhen!"); line("fugl-froe", "Saml de lysende frø!"); }, 500);
      raf = requestAnimationFrame(frame);
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      stopAudio();
    }
  });
})();
