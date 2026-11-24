// Spil: Lommelygten — en hyggelig nordisk natteskov, hvor barnet lyser med lommelygten
// og finder 8 sovende/gemte skovdyr. Blinkende øjne kigger frem i mørket; hold lyset på et dyr
// et kort øjeblik, så titter det frem med lyd og stemme. Lys på svampe, ildfluer og månen for ekstra magi.
// Ingen tabe-tilstand. Dybe links til test: #lommelygten/fest, #lommelygten/lys
(function () {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function rrect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }
  const STORAGE_KEY = "lk-lommelygten";
  const FIND_TIME = 0.45; // sekunder med lys på et dyr før det kommer frem
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  // Alle 8 skovvenner med fast habitat (landskab + portræt) og lydnøgler
  const DYR_DATA = [
    {
      id: "ugle", navn: "uglen", replik: "Se, det er uglen!", lyd: ["lommelygt-ugle", "dyr-ugle"],
      posL: [0.22, 0.35], posP: [0.26, 0.27], eyeOff: [0, -0.18], spot: "hule",
    },
    {
      id: "froe", navn: "frøen", replik: "Se, det er frøen!", lyd: ["lommelygt-froe", "dyr-froe"],
      posL: [0.72, 0.79], posP: [0.68, 0.76], eyeOff: [0, -0.22], spot: "dam",
    },
    {
      id: "mus", navn: "musen", replik: "Se, det er den lille mus!", lyd: ["lommelygt-mus", "dyr-mus"],
      posL: [0.22, 0.81], posP: [0.25, 0.75], eyeOff: [0.05, -0.1], spot: "stamme",
    },
    {
      id: "bjoern", navn: "bjørnen", replik: "Se, det er bjørnen!", lyd: "lommelygt-bjoern",
      posL: [0.14, 0.61], posP: [0.23, 0.54], eyeOff: [0, -0.24], spot: "busk",
    },
    {
      id: "raev", navn: "ræven", replik: "Se, det er ræven!", lyd: "lommelygt-raev",
      posL: [0.85, 0.62], posP: [0.77, 0.53], eyeOff: [-0.08, -0.16], spot: "gran",
    },
    {
      id: "pindsvin", navn: "pindsvinet", replik: "Se, det er pindsvinet!", lyd: "lommelygt-pindsvin",
      posL: [0.47, 0.86], posP: [0.45, 0.86], eyeOff: [0.16, -0.08], spot: "graes",
    },
    {
      id: "raadyr", navn: "rådyret", replik: "Se, det er rådyret!", lyd: "lommelygt-raadyr",
      posL: [0.61, 0.53], posP: [0.73, 0.36], eyeOff: [-0.08, -0.34], spot: "lysning",
    },
    {
      id: "kanin", navn: "kaninen", replik: "Se, det er kaninen!", lyd: "lommelygt-kanin",
      posL: [0.39, 0.66], posP: [0.27, 0.40], eyeOff: [0, -0.16], spot: "bregne",
    },
  ];

  Spil.css("css-lommelygten", `
    .ll{position:absolute;inset:0;overflow:hidden;background:#080d22;touch-action:none}
    .ll canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .ll-jar{position:absolute;z-index:6;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      display:flex;align-items:center;gap:clamp(6px,1.2vmin,12px);
      padding:clamp(7px,1.2vmin,12px) clamp(12px,1.8vmin,18px);border-radius:999px;
      background:rgba(16,24,54,.62);box-shadow:inset 0 0 0 2px rgba(255,232,150,.32),0 6px 18px rgba(0,0,0,.35);
      pointer-events:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:transform .28s ease}
    .ll-jar.pulse{transform:scale(1.09)}
    .ll-jar-ico{width:clamp(24px,3.6vmin,34px);height:clamp(28px,4.2vmin,40px);flex:none}
    .ll-dots{display:flex;gap:clamp(4px,.8vmin,8px);align-items:center}
    .ll-dots i{width:clamp(10px,1.8vmin,16px);aspect-ratio:1;border-radius:50%;
      background:rgba(255,240,190,.2);box-shadow:inset 0 0 0 1.5px rgba(255,235,170,.35);
      transition:background .35s,box-shadow .35s,transform .35s}
    .ll-dots i.on{background:#ffe57a;box-shadow:0 0 10px 3px rgba(255,220,90,.85);transform:scale(1.18)}
    .ll-hint{position:absolute;z-index:7;bottom:calc(2.4vh + env(safe-area-inset-bottom,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(68px,10vh,86px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 35% 30%,#fff6c8,#ffd25a 65%,#e4a628);
      box-shadow:0 6px 0 #9f6d10,0 10px 24px rgba(0,0,0,.42),0 0 24px rgba(255,216,100,.35);
      font-size:clamp(30px,4.8vh,42px);display:grid;place-items:center;transition:transform .15s,opacity .35s}
    .ll-hint:active{transform:translateY(4px);box-shadow:0 2px 0 #9f6d10,0 6px 14px rgba(0,0,0,.35)}
    .ll-hint[hidden]{display:none}
    .ll-again{position:absolute;z-index:8;left:50%;bottom:calc(7vh + env(safe-area-inset-bottom,0px));
      transform:translateX(-50%) scale(.7);opacity:0;pointer-events:none;
      width:clamp(92px,14vh,126px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 35% 30%,#fff8d6,#ffda6b 62%,#e8a72c);
      box-shadow:0 8px 0 #9b6a10,0 16px 36px rgba(0,0,0,.48),0 0 42px rgba(255,225,120,.6);
      font-size:clamp(44px,7vh,62px);display:grid;place-items:center;
      transition:transform .5s cubic-bezier(.22,1.35,.36,1),opacity .45s ease}
    .ll-again.show{opacity:1;pointer-events:auto;transform:translateX(-50%) scale(1)}
    .ll-again:active{transform:translateX(-50%) translateY(5px) scale(.96)}
    @media (prefers-reduced-motion:reduce){.ll-jar,.ll-dots i,.ll-hint,.ll-again{transition:none}}
  `);

  let root, cv, g, darkCv, dg, jarEl, dotsEl, hintBtn, againBtn;
  let alive, raf, timers, W, H, S, dpr, last, time, portrait;
  let beam, holding, pointerId, pointerActive, idleAfter;
  let stars, trees, mushrooms, fireflies, particles, animals, activeRound;
  let moon, celebrate, celebrateT, canRestart, darkAlpha, autoHintT, lastRustleT;
  let nightsDone, audio, revealAll;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

  /* ---------- Gemt tilstand ---------- */
  function loadNights() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? JSON.parse(raw) : 0;
      return typeof n === "number" && n >= 0 ? n : (n && typeof n.naetter === "number" ? n.naetter : 0);
    } catch (e) { return 0; }
  }
  function saveNights(n) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ naetter: n })); } catch (e) {}
  }

  /* ---------- Blød Web Audio: natteskov, raslen, dyrelyde og vuggevise ---------- */
  function startAudio() {
    try {
      const c = Spil.audio(); if (!c) return;
      // Blid nattebrise (lavt filtreret støj)
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < d.length; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 2.5; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 340;
      const wind = c.createGain(); wind.gain.value = 0.012;
      src.connect(lp).connect(wind).connect(c.destination);
      // Blød klang-bus med let ekko til svampe, ildfluer og vuggevise
      const bus = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
      dl.delayTime.value = 0.28; fb.gain.value = 0.3; wet.gain.value = 0.42;
      bus.connect(c.destination); bus.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(c.destination);
      src.start();
      audio = { c, src, wind, bus, nodes: [lp, dl, fb, wet] };
    } catch (e) { audio = null; }
  }
  function stopAudio() {
    if (!audio) return;
    try { audio.src.stop(); } catch (e) {}
    try { [audio.wind, audio.bus, ...audio.nodes].forEach(n => n.disconnect()); } catch (e) {}
    audio = null;
  }
  function chime(freq, vol = 0.13, dur = 1.2, delay = 0) {
    if (!audio) return;
    try {
      const c = audio.c, t = c.currentTime + delay;
      [[freq, "sine", vol], [freq * 2, "triangle", vol * 0.16]].forEach(([f, type, v]) => {
        const o = c.createOscillator(), gn = c.createGain();
        o.type = type; o.frequency.value = f;
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(v, t + 0.015);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gn).connect(audio.bus); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) {}
  }
  function rustle() {
    if (!audio) return;
    try {
      const c = audio.c, t = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.18), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env * 0.35;
      }
      const s = c.createBufferSource(); s.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 600; bp.Q.value = 1.4;
      const gn = c.createGain(); gn.gain.value = 0.09;
      s.connect(bp).connect(gn).connect(c.destination); s.start(t);
    } catch (e) {}
  }
  function playAnimalSynth(id) {
    if (!audio) return;
    try {
      const c = audio.c, t = c.currentTime;
      if (id === "bjoern") {
        // Blød, hyggelig bjørne-brummen / gaben
        const o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(84, t + 0.48);
        f.type = "lowpass"; f.frequency.value = 280;
        gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.14, t + 0.08); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
        o.connect(f).connect(gn).connect(c.destination); o.start(t); o.stop(t + 0.56);
      } else if (id === "raev") {
        // Legende lille ræve-bjæf / yip
        [0, 0.14].forEach((d, i) => {
          const o = c.createOscillator(), gn = c.createGain();
          o.type = "triangle"; o.frequency.setValueAtTime(640 + i * 90, t + d); o.frequency.exponentialRampToValueAtTime(980 + i * 110, t + d + 0.09);
          gn.gain.setValueAtTime(0.0001, t + d); gn.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
          o.connect(gn).connect(audio.bus); o.start(t + d); o.stop(t + d + 0.14);
        });
      } else if (id === "pindsvin") {
        // Blide små snøft i græsset
        [0, 0.12, 0.24].forEach(d => {
          const len = Math.floor(c.sampleRate * 0.08), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
          for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
          const s = c.createBufferSource(); s.buffer = buf;
          const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 2.5;
          const gn = c.createGain(); gn.gain.value = 0.11;
          s.connect(bp).connect(gn).connect(c.destination); s.start(t + d);
        });
      } else if (id === "raadyr") {
        // Blød harpe-klang som skovens rådyr
        chime(587.33, 0.11, 1.1, 0); chime(880, 0.1, 1.2, 0.1); chime(1174.66, 0.08, 1.3, 0.2);
      } else if (id === "kanin") {
        // To små hoppe-pib
        [0, 0.13].forEach((d, i) => {
          const o = c.createOscillator(), gn = c.createGain();
          o.type = "sine"; o.frequency.setValueAtTime(760 + i * 120, t + d); o.frequency.exponentialRampToValueAtTime(1180 + i * 160, t + d + 0.07);
          gn.gain.setValueAtTime(0.0001, t + d); gn.gain.exponentialRampToValueAtTime(0.09, t + d + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.09);
          o.connect(gn).connect(audio.bus); o.start(t + d); o.stop(t + d + 0.11);
        });
      } else {
        // Blid stjerneklang til ugle/frø/mus lige ved opdagelse (rigtig dyrelyd følger via Spil.say)
        chime(659.25, 0.1, 0.9, 0); chime(880, 0.09, 1.0, 0.09);
      }
    } catch (e) {}
  }
  function playLullaby() {
    // Rolig lille vuggevise-melodi i pentatonisk dur
    const notes = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 523.25];
    notes.forEach((f, i) => chime(f, 0.11, 1.6, i * 0.28));
  }

  /* ---------- Opsætning af scene & runde ---------- */
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    S = Math.min(W, H);
    portrait = W < H;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Mørke-lærred i halv/fuld opløsning (meget hurtigt på iPad)
    const dScale = Math.min(1.5, dpr);
    darkCv.width = Math.max(1, Math.round(W * dScale));
    darkCv.height = Math.max(1, Math.round(H * dScale));
    dg.setTransform(dScale, 0, 0, dScale, 0, 0);
    if (beam) {
      beam.r = clamp(S * 0.23, 105, 195);
      beam.x = clamp(beam.x, 0, W); beam.y = clamp(beam.y, 0, H);
      beam.tx = clamp(beam.tx, 0, W); beam.ty = clamp(beam.ty, 0, H);
    }
    placeMoon();
    layoutAnimals();
  }

  function placeMoon() {
    moon = moon || { smile: 0, glow: 0, lastTalk: -99 };
    moon.x = portrait ? W * 0.50 : W * 0.34;
    moon.y = portrait ? H * 0.13 : H * 0.15;
    moon.r = clamp(S * 0.058, 24, 44);
  }

  function layoutAnimals() {
    if (!animals) return;
    animals.forEach(a => {
      const [nx, ny] = portrait ? a.data.posP : a.data.posL;
      a.x = nx * W; a.y = ny * H;
      a.sz = clamp(S * (portrait ? 0.13 : 0.115), 50, 96);
    });
  }

  function buildScenery() {
    stars = Array.from({ length: 85 }, (_, i) => ({
      x: hash(i * 3 + 1), y: hash(i * 3 + 2) * 0.52,
      r: 0.7 + hash(i * 3 + 3) * 1.7,
      a: 0.35 + hash(i * 5 + 7) * 0.65,
      ph: hash(i * 7 + 4) * TAU, sp: 0.9 + hash(i * 11 + 2) * 1.8,
    }));
    // Baggrunds- og mellemgrundstræer
    trees = [
      { nx: 0.06, ny: 0.57, h: 0.24, layer: 0 }, { nx: 0.16, ny: 0.54, h: 0.27, layer: 0 },
      { nx: 0.31, ny: 0.53, h: 0.22, layer: 0 }, { nx: 0.46, ny: 0.51, h: 0.26, layer: 0 },
      { nx: 0.55, ny: 0.54, h: 0.23, layer: 0 }, { nx: 0.70, ny: 0.52, h: 0.28, layer: 0 },
      { nx: 0.82, ny: 0.54, h: 0.25, layer: 0 }, { nx: 0.94, ny: 0.57, h: 0.26, layer: 0 },
      { nx: 0.05, ny: 0.69, h: 0.28, layer: 1 }, { nx: 0.35, ny: 0.62, h: 0.25, layer: 1 },
      { nx: 0.52, ny: 0.61, h: 0.27, layer: 1 }, { nx: 0.78, ny: 0.62, h: 0.29, layer: 1 },
      { nx: 0.93, ny: 0.68, h: 0.27, layer: 1 },
    ];
    // Selvlysende svampe spredt i skovbunden
    const mSpots = [
      [0.11, 0.74, "#6ef5d5"], [0.34, 0.78, "#a68cff"],
      [0.60, 0.74, "#7df2ff"], [0.89, 0.74, "#ffd479"],
    ];
    mushrooms = mSpots.map(([nx, ny, col], i) => ({
      nx, ny, col, glow: 0.25, lit: 0, cooldown: 0, ph: i * 1.7,
    }));
    // Ildfluer der svæver roligt i natten
    fireflies = Array.from({ length: still ? 7 : 14 }, (_, i) => makeFirefly(i));
  }

  function makeFirefly(seed) {
    return {
      x: (0.12 + Math.random() * 0.76) * (W || 1000),
      y: (0.24 + Math.random() * 0.58) * (H || 800),
      vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 14,
      ph: Math.random() * TAU, sp: 1.8 + Math.random() * 2,
      toJar: false, jarT: 0, sx: 0, sy: 0,
      col: seed % 3 === 0 ? "#c8ff78" : "#ffe97d",
    };
  }

  function startRound(isFirst) {
    celebrate = false; celebrateT = 0; canRestart = false;
    darkAlpha = revealAll ? 0.16 : 0.87;
    againBtn.classList.remove("show");
    hintBtn.hidden = false;
    particles = [];
    fireflies = Array.from({ length: still ? 7 : 14 }, (_, i) => makeFirefly(i));

    // På smal telefon-skærm: 6 dyr pr. nat (roterer så alle 8 opleves); på bred iPad: alle 8!
    const count = portrait ? 6 : 8;
    const pool = Spil.shuffle(DYR_DATA.slice());
    activeRound = pool.slice(0, count);

    animals = activeRound.map((data, i) => ({
      data, x: 0, y: 0, sz: 72,
      found: revealAll, charge: revealAll ? 1 : 0, pop: revealAll ? 1 : 0,
      react: 0, reactCool: 0, hintGlow: 0,
      blinkT: 1 + Math.random() * 3.5, blinkDur: 0,
      ph: i * 1.3 + Math.random() * 2,
    }));
    layoutAnimals();
    renderHud();
    autoHintT = time + 16;

    if (!isFirst) {
      Spil.say("En ny nat i skoven! Hvem gemmer sig nu?", null, "lommelygt-ny");
    }
  }

  function renderHud() {
    const found = animals.filter(a => a.found).length;
    dotsEl.innerHTML = animals.map((_, i) => `<i class="${i < found ? "on" : ""}"></i>`).join("");
  }

  function pulseJar() {
    jarEl.classList.remove("pulse"); void jarEl.offsetWidth; jarEl.classList.add("pulse");
    later(() => jarEl.classList.remove("pulse"), 320);
  }

  function jarPos() {
    const r = jarEl.getBoundingClientRect();
    return { x: r.left + 22, y: r.top + r.height / 2 };
  }

  function spawnSparkles(x, y, n, col = "#ffe680") {
    const count = still ? Math.min(4, n) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = 28 + Math.random() * 95;
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 18,
        life: 0, max: 0.65 + Math.random() * 0.55,
        r: 2.5 + Math.random() * 4.5, col, kind: "star",
      });
    }
  }

  /* ---------- Opdagelse, hjælp & fest ---------- */
  function discover(a) {
    a.found = true; a.charge = 1; a.pop = 0; a.react = 1; a.reactCool = 2.4; a.hintGlow = 0;
    autoHintT = time + 18;
    renderHud(); pulseJar();
    spawnSparkles(a.x, a.y - a.sz * 0.2, 16, "#ffe680");
    if (!still) Spil.burst(a.x, a.y - a.sz * 0.25, "✨⭐🌟✨⭐");
    playAnimalSynth(a.data.id);
    Spil.say(a.data.replik, null, a.data.lyd);

    if (animals.every(x => x.found) && !celebrate) {
      later(startCelebration, 1750);
    }
  }

  function startCelebration() {
    if (celebrate || !alive) return;
    celebrate = true; celebrateT = 0; canRestart = false;
    hintBtn.hidden = true;
    nightsDone++; saveNights(nightsDone);
    playLullaby();
    Spil.say("Godnat alle dyr! Hvor var du god til at finde dem!", null, "lommelygt-godnat");
    // Slip ekstra ildfluer løs til nattefesten
    for (let i = 0; i < (still ? 6 : 18); i++) {
      const f = makeFirefly(i);
      f.y = H * (0.18 + Math.random() * 0.62);
      fireflies.push(f);
    }
    later(() => {
      canRestart = true;
      againBtn.classList.add("show");
    }, 1800);
  }

  function triggerHint() {
    if (celebrate) return;
    const hidden = animals.filter(a => !a.found);
    if (!hidden.length) return;
    const pick = hidden[Math.random() * hidden.length | 0];
    pick.hintGlow = 3.2;
    pick.blinkDur = 0; // åbn øjnene helt op
    rustle();
    chime(783.99, 0.1, 0.9, 0);
    spawnSparkles(pick.x, pick.y - pick.sz * 0.15, 8, "#fff2a6");
    if (!Spil.isTalking()) Spil.say("Hvem gemmer sig i skoven?", null, "lommelygt-hint");
  }

  /* ---------- Opdatering ---------- */
  function update(dt) {
    time += dt;

    // Lommelygtens bevægelse: følger finger/mus, eller svajer blidt i midten når ingen rører
    const isIdle = !holding && (!pointerActive || time > idleAfter);
    if (isIdle) {
      const cx = W * 0.5, cy = H * 0.60;
      beam.tx = still ? cx : cx + Math.sin(time * 0.45) * W * 0.14;
      beam.ty = still ? cy : cy + Math.sin(time * 0.9) * H * 0.06;
    }
    const follow = holding ? 18 : 6.5;
    beam.x = lerp(beam.x, beam.tx, 1 - Math.exp(-dt * follow));
    beam.y = lerp(beam.y, beam.ty, 1 - Math.exp(-dt * follow));

    // Mørket løfter sig blidt under nattefesten
    const targetDark = celebrate || revealAll ? 0.18 : 0.87;
    darkAlpha = lerp(darkAlpha, targetDark, 1 - Math.exp(-dt * 2.2));
    if (celebrate) celebrateT += dt;

    // Månen: smiler og glimter, når man lyser på den
    const md = Math.hypot(beam.x - moon.x, beam.y - moon.y);
    const moonLit = md < beam.r * 0.85;
    moon.glow = lerp(moon.glow, moonLit || celebrate ? 1 : 0, 1 - Math.exp(-dt * 4));
    if (moonLit && moon.smile <= 0.15) {
      moon.smile = 3.5;
      chime(1046.5, 0.1, 1.3, 0); chime(1318.5, 0.08, 1.4, 0.12);
      spawnSparkles(moon.x, moon.y, 10, "#fff5b8");
      if (!Spil.isTalking() && time - moon.lastTalk > 22) {
        moon.lastTalk = time;
        Spil.say("Hej måne! Hvor skinner du flot!", null, "lommelygt-maane");
      }
    }
    if (moon.smile > 0 && !celebrate) moon.smile = Math.max(0, moon.smile - dt);

    // Dyr: opdagelse, blinken og glade reaktioner
    animals.forEach(a => {
      const dist = Math.hypot(beam.x - a.x, beam.y - (a.y - a.sz * 0.15));
      const lit = dist < beam.r * 0.78;
      if (a.hintGlow > 0) a.hintGlow = Math.max(0, a.hintGlow - dt);
      if (a.react > 0) a.react = Math.max(0, a.react - dt * 1.4);
      if (a.reactCool > 0) a.reactCool = Math.max(0, a.reactCool - dt);

      if (!a.found) {
        // Blinkende øjne i mørket
        if (a.blinkDur > 0) a.blinkDur = Math.max(0, a.blinkDur - dt);
        else {
          a.blinkT -= dt;
          if (a.blinkT <= 0) { a.blinkDur = 0.18; a.blinkT = 2.2 + Math.random() * 3.8; }
        }
        if (lit) {
          if (a.charge === 0 && time - lastRustleT > 0.7) { lastRustleT = time; rustle(); }
          a.charge = Math.min(1, a.charge + dt / FIND_TIME);
          if (a.charge >= 1) discover(a);
        } else {
          a.charge = Math.max(0, a.charge - dt * 1.4);
        }
      } else {
        a.pop = Math.min(1, a.pop + dt * 2.6);
        if (lit && a.reactCool <= 0 && !celebrate) {
          a.react = 1; a.reactCool = 2.6;
          spawnSparkles(a.x, a.y - a.sz * 0.25, 7, "#ffe680");
          playAnimalSynth(a.data.id);
        }
      }
    });

    // Blid automatisk øje-glimt hvis barnet ikke har fundet et dyr i et stykke tid
    if (!celebrate && time > autoHintT) {
      autoHintT = time + 14;
      const hidden = animals.filter(a => !a.found);
      if (hidden.length) {
        const pick = hidden[Math.random() * hidden.length | 0];
        pick.hintGlow = 2.4;
      }
    }

    // Selvlysende svampe
    mushrooms.forEach((m, i) => {
      const mx = m.nx * W, my = m.ny * H;
      const lit = Math.hypot(beam.x - mx, beam.y - my) < beam.r * 0.72;
      if (m.cooldown > 0) m.cooldown = Math.max(0, m.cooldown - dt);
      if (lit && m.cooldown <= 0) {
        m.lit = 1; m.cooldown = 1.6;
        chime(PENTATONIC[i % PENTATONIC.length], 0.09, 1.1, 0);
        spawnSparkles(mx, my - 12, 6, m.col);
      }
      m.lit = Math.max(0, m.lit - dt * 0.65);
      m.glow = lerp(m.glow, lit || m.lit > 0 || celebrate ? 1 : 0.26, 1 - Math.exp(-dt * 5));
    });

    // Ildfluer: svæver frit, og flyver op i krukken når lommelygten rammer dem
    const jp = jarPos();
    fireflies.forEach((f, idx) => {
      if (f.toJar) {
        f.jarT += dt * 1.25;
        const t = smooth(clamp(f.jarT, 0, 1));
        const arc = Math.sin(t * Math.PI) * -55;
        f.x = lerp(f.sx, jp.x, t);
        f.y = lerp(f.sy, jp.y, t) + arc;
        if (f.jarT >= 1) {
          pulseJar();
          spawnSparkles(jp.x, jp.y, 4, f.col);
          Object.assign(f, makeFirefly(idx));
        }
      } else {
        if (!still) {
          f.x += (f.vx + Math.sin(time * 0.9 + f.ph) * 14) * dt;
          f.y += (f.vy + Math.cos(time * 1.1 + f.ph) * 12) * dt;
        }
        if (f.x < 20) f.vx = Math.abs(f.vx) + 4;
        if (f.x > W - 20) f.vx = -Math.abs(f.vx) - 4;
        if (f.y < H * 0.16) f.vy = Math.abs(f.vy) + 4;
        if (f.y > H * 0.88) f.vy = -Math.abs(f.vy) - 4;

        if (!celebrate && Math.hypot(beam.x - f.x, beam.y - f.y) < beam.r * 0.42) {
          f.toJar = true; f.jarT = 0; f.sx = f.x; f.sy = f.y;
          chime(PENTATONIC[(idx + 2) % PENTATONIC.length] * 1.5, 0.06, 0.7, 0);
        }
      }
    });

    // Partikler
    particles.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 24 * dt; });
    particles = particles.filter(p => p.life < p.max);
  }

  /* ---------- Tegning af den nordiske natteskov ---------- */
  function drawSky() {
    const gr = g.createLinearGradient(0, 0, 0, H * 0.64);
    gr.addColorStop(0, "#09102b");
    gr.addColorStop(0.55, "#152550");
    gr.addColorStop(1, "#233d6e");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    // Blid nordlys-antydning i toppen under nattefesten
    if (celebrate) {
      const a = Math.min(0.28, celebrateT * 0.12);
      const ag = g.createLinearGradient(0, 0, W, H * 0.45);
      ag.addColorStop(0, `rgba(90,235,195,0)`);
      ag.addColorStop(0.35, `rgba(90,235,195,${a})`);
      ag.addColorStop(0.7, `rgba(145,130,255,${a * 0.85})`);
      ag.addColorStop(1, `rgba(90,235,195,0)`);
      g.fillStyle = ag; g.fillRect(0, 0, W, H * 0.5);
    }

    // Stjerner
    stars.forEach(s => {
      const tw = still ? 0.85 : 0.55 + 0.45 * Math.sin(time * s.sp + s.ph);
      const boost = celebrate ? 1.25 : 1;
      g.fillStyle = `rgba(255,252,232,${clamp(s.a * tw * boost, 0, 1)})`;
      g.beginPath(); g.arc(s.x * W, s.y * H, s.r * Math.max(0.9, S / 820), 0, TAU); g.fill();
    });

    drawMoon();
  }

  function drawMoon() {
    const { x, y, r, glow, smile } = moon;
    // Blød måneglød
    const gl = g.createRadialGradient(x, y, r * 0.2, x, y, r * (3.2 + glow * 1.4));
    gl.addColorStop(0, `rgba(255,244,196,${0.32 + glow * 0.28})`);
    gl.addColorStop(0.45, `rgba(210,224,255,${0.12 + glow * 0.12})`);
    gl.addColorStop(1, "rgba(210,224,255,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 4.6, 0, TAU); g.fill();

    // Venlig halvmåne
    g.save(); g.translate(x, y);
    g.fillStyle = "#fff3c4";
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // Udskæring så den bliver en blød halvmåne (farvet som himlen)
    g.fillStyle = "#101c40";
    g.beginPath(); g.arc(r * 0.42, -r * 0.12, r * 0.86, 0, TAU); g.fill();
    // Lille venligt ansigt på månen når den smiler eller under fest
    if (smile > 0 || celebrate) {
      const a = celebrate ? 0.85 : clamp(smile, 0, 1) * 0.85;
      g.strokeStyle = `rgba(110,82,36,${a})`; g.lineWidth = Math.max(1.8, r * 0.065); g.lineCap = "round";
      g.beginPath(); g.arc(-r * 0.42, -r * 0.08, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(-r * 0.34, r * 0.24, r * 0.16, 0.1 * Math.PI, 0.78 * Math.PI); g.stroke();
      g.fillStyle = `rgba(255,150,150,${a * 0.45})`;
      g.beginPath(); g.arc(-r * 0.56, r * 0.12, r * 0.11, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawPine(x, y, h, colDark, colLight) {
    // Stamme
    g.fillStyle = "#2b1e19";
    g.fillRect(x - h * 0.045, y - h * 0.22, h * 0.09, h * 0.24);
    for (let i = 0; i < 4; i++) {
      const ty = y - h * (0.14 + i * 0.2);
      const tw = h * (0.32 - i * 0.055);
      const th = h * (0.34 - i * 0.03);
      g.fillStyle = colDark;
      g.beginPath(); g.moveTo(x - tw, ty); g.lineTo(x, ty - th); g.lineTo(x + tw, ty); g.closePath(); g.fill();
      g.fillStyle = colLight;
      g.beginPath(); g.moveTo(x - tw * 0.15, ty - th * 0.08); g.lineTo(x, ty - th); g.lineTo(x - tw * 0.62, ty - th * 0.02); g.closePath(); g.fill();
    }
  }

  function drawForest() {
    // Fjerne blå bakker
    g.fillStyle = "#142346";
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) {
      const nx = x / W;
      const y = H * (0.50 - 0.04 * Math.sin(nx * 5.2 + 0.5) - 0.02 * Math.sin(nx * 11));
      g.lineTo(x, y);
    }
    g.lineTo(W, H); g.closePath(); g.fill();

    // Baggrunds-grantræer
    trees.filter(t => t.layer === 0).forEach(t => drawPine(t.nx * W, t.ny * H, t.h * H, "#122a38", "#1a3c48"));

    // Mellemste skovbakke
    const hill1 = g.createLinearGradient(0, H * 0.50, 0, H * 0.85);
    hill1.addColorStop(0, "#1c3d3c"); hill1.addColorStop(1, "#132c2c");
    g.fillStyle = hill1;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) {
      const nx = x / W;
      const y = H * (0.58 + 0.035 * Math.sin(nx * 4.4 - 0.8) + 0.015 * Math.cos(nx * 9.5));
      g.lineTo(x, y);
    }
    g.lineTo(W, H); g.closePath(); g.fill();

    // Mellemgrunds-grantræer
    trees.filter(t => t.layer === 1).forEach(t => drawPine(t.nx * W, t.ny * H, t.h * H, "#163834", "#235246"));

    // Det store hyggelige ugle-træ med knasthul
    const owlPos = portrait ? DYR_DATA[0].posP : DYR_DATA[0].posL;
    drawHollowTree(owlPos[0] * W, owlPos[1] * H);

    // Forgrundens mos-bakke
    const hill2 = g.createLinearGradient(0, H * 0.66, 0, H);
    hill2.addColorStop(0, "#244c3d"); hill2.addColorStop(0.5, "#19382e"); hill2.addColorStop(1, "#112722");
    g.fillStyle = hill2;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) {
      const nx = x / W;
      const y = H * (0.71 - 0.03 * Math.sin(nx * 3.8 + 1.2) + 0.015 * Math.sin(nx * 8.2));
      g.lineTo(x, y);
    }
    g.lineTo(W, H); g.closePath(); g.fill();

    // Skovdam (til frøen)
    const frogPos = portrait ? DYR_DATA[1].posP : DYR_DATA[1].posL;
    drawPond(frogPos[0] * W, frogPos[1] * H + S * 0.03);

    // Hule-busk (til bjørnen)
    const bearPos = portrait ? DYR_DATA[3].posP : DYR_DATA[3].posL;
    drawBush(bearPos[0] * W, bearPos[1] * H + S * 0.04, S * 0.14);

    // Mosset træstamme (til musen)
    const mousePos = portrait ? DYR_DATA[2].posP : DYR_DATA[2].posL;
    drawMossyLog(mousePos[0] * W, mousePos[1] * H + S * 0.02, S * 0.16);

    // Bregne (til kaninen)
    const rabPos = portrait ? DYR_DATA[7].posP : DYR_DATA[7].posL;
    drawFern(rabPos[0] * W, rabPos[1] * H + S * 0.04, S * 0.1);

    // Selvlysende svampe
    mushrooms.forEach(drawMushroom);

    // Små græstotter i skovbunden
    g.strokeStyle = "#31634c"; g.lineWidth = Math.max(1.8, S * 0.004); g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i < 24; i++) {
      const gx = (0.04 + hash(i * 13 + 3) * 0.92) * W;
      const gy = (0.72 + hash(i * 17 + 5) * 0.24) * H;
      const gh = (10 + hash(i * 19) * 12) * (S / 800);
      const sw = still ? 0 : Math.sin(time * 1.6 + i) * 3;
      g.moveTo(gx - 4, gy); g.lineTo(gx - 6 + sw, gy - gh * 0.85);
      g.moveTo(gx, gy); g.lineTo(gx + sw, gy - gh);
      g.moveTo(gx + 4, gy); g.lineTo(gx + 6 + sw, gy - gh * 0.8);
    }
    g.stroke();
  }

  function drawHollowTree(x, y) {
    const w = clamp(S * 0.12, 48, 86);
    const bot = H * 0.76;
    // Stamme
    g.fillStyle = "#4b3324";
    g.beginPath();
    g.moveTo(x - w * 0.52, bot);
    g.quadraticCurveTo(x - w * 0.44, y + w * 0.6, x - w * 0.42, y - w * 0.9);
    g.lineTo(x + w * 0.42, y - w * 0.9);
    g.quadraticCurveTo(x + w * 0.44, y + w * 0.6, x + w * 0.56, bot);
    g.closePath(); g.fill();
    // Lysere barkside
    g.fillStyle = "#5c3f2d";
    g.beginPath();
    g.moveTo(x - w * 0.36, bot);
    g.quadraticCurveTo(x - w * 0.3, y + w * 0.5, x - w * 0.28, y - w * 0.85);
    g.lineTo(x - w * 0.02, y - w * 0.85);
    g.quadraticCurveTo(x - w * 0.05, y + w * 0.5, x - w * 0.08, bot);
    g.closePath(); g.fill();
    // Gren
    g.strokeStyle = "#4b3324"; g.lineWidth = w * 0.22; g.lineCap = "round";
    g.beginPath(); g.moveTo(x + w * 0.25, y - w * 0.35); g.quadraticCurveTo(x + w * 0.85, y - w * 0.5, x + w * 1.15, y - w * 0.78); g.stroke();
    // Løvkrone foroven
    g.fillStyle = "#1a4236";
    [[0, -1.25, 0.95], [-0.75, -0.95, 0.75], [0.78, -0.92, 0.78], [0.35, -1.35, 0.72], [-0.4, -1.32, 0.68]].forEach(([dx, dy, r]) => {
      g.beginPath(); g.arc(x + dx * w, y + dy * w, r * w, 0, TAU); g.fill();
    });
    g.fillStyle = "#245746";
    [[-0.25, -1.35, 0.55], [0.35, -1.15, 0.48]].forEach(([dx, dy, r]) => {
      g.beginPath(); g.arc(x + dx * w, y + dy * w, r * w, 0, TAU); g.fill();
    });
    // Mørkt knasthul hvor uglen sidder
    g.fillStyle = "#22150e";
    g.beginPath(); g.ellipse(x, y - w * 0.04, w * 0.34, w * 0.42, 0, 0, TAU); g.fill();
    g.strokeStyle = "#6c4b36"; g.lineWidth = Math.max(2, w * 0.05);
    g.beginPath(); g.ellipse(x, y - w * 0.04, w * 0.36, w * 0.44, 0, 0, TAU); g.stroke();
  }

  function drawPond(x, y) {
    const rx = clamp(S * 0.16, 68, 130), ry = rx * 0.4;
    const gr = g.createRadialGradient(x, y - ry * 0.2, rx * 0.1, x, y, rx);
    gr.addColorStop(0, "#2b5e85"); gr.addColorStop(0.7, "#1b3d5c"); gr.addColorStop(1, "#122940");
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    // Blide vandkrusninger
    g.strokeStyle = "rgba(180,225,255,0.28)"; g.lineWidth = 2; g.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const off = still ? 0 : Math.sin(time * 1.4 + i * 2) * 5;
      g.beginPath();
      g.moveTo(x - rx * (0.42 - i * 0.1) + off, y + (i - 1) * ry * 0.35);
      g.lineTo(x + rx * (0.28 - i * 0.06) + off, y + (i - 1) * ry * 0.35);
      g.stroke();
    }
    // Åkandeblad til frøen
    g.fillStyle = "#3f8d58";
    g.beginPath(); g.ellipse(x, y - ry * 0.1, rx * 0.32, ry * 0.32, 0, 0.28, TAU - 0.28); g.lineTo(x, y - ry * 0.1); g.closePath(); g.fill();
    // Et par siv ved bredden
    g.strokeStyle = "#326c4c"; g.lineWidth = 2.5;
    [[-0.88, -0.1, 0.45], [-0.78, 0.05, 0.52], [0.85, -0.05, 0.48]].forEach(([dx, dy, h]) => {
      const sx = x + dx * rx, sy = y + dy * ry;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 4, sy - h * rx * 0.5, sx + 8, sy - h * rx); g.stroke();
    });
  }

  function drawBush(x, y, s) {
    g.fillStyle = "#193e33";
    [[0, -0.25, 0.48], [-0.42, -0.05, 0.36], [0.42, -0.04, 0.38], [-0.22, -0.32, 0.34], [0.24, -0.3, 0.35]].forEach(([dx, dy, r]) => {
      g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    });
    g.fillStyle = "#265a47";
    [[-0.2, -0.35, 0.24], [0.18, -0.32, 0.22], [0, -0.22, 0.25]].forEach(([dx, dy, r]) => {
      g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill();
    });
  }

  function drawMossyLog(x, y, s) {
    g.save(); g.translate(x, y);
    // Stamme
    g.fillStyle = "#5c3d28";
    rrect(g, -s * 0.65, -s * 0.22, s * 1.25, s * 0.44, s * 0.18); g.fill();
    g.fillStyle = "#6e4b32";
    rrect(g, -s * 0.6, -s * 0.2, s * 1.1, s * 0.16, s * 0.1); g.fill();
    // Hul ende til musen
    g.fillStyle = "#2a1910";
    g.beginPath(); g.ellipse(s * 0.52, 0, s * 0.16, s * 0.2, 0, 0, TAU); g.fill();
    g.strokeStyle = "#825b3d"; g.lineWidth = Math.max(2, s * 0.03);
    g.beginPath(); g.ellipse(s * 0.52, 0, s * 0.17, s * 0.21, 0, 0, TAU); g.stroke();
    // Mos-puder ovenpå
    g.fillStyle = "#3f8754";
    [[-0.35, -0.22, 0.18], [-0.14, -0.24, 0.15], [0.12, -0.22, 0.16]].forEach(([dx, dy, r]) => {
      g.beginPath(); g.ellipse(dx * s, dy * s, r * s, r * s * 0.5, 0, Math.PI, TAU); g.fill();
    });
    g.restore();
  }

  function drawFern(x, y, s) {
    g.save(); g.translate(x, y);
    [-0.65, -0.25, 0.25, 0.65].forEach((ang, i) => {
      g.save();
      g.rotate(ang + (still ? 0 : Math.sin(time * 1.5 + i) * 0.04));
      g.strokeStyle = "#3a8453"; g.lineWidth = Math.max(2, s * 0.045); g.lineCap = "round";
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.4, 0, -s * 0.72); g.stroke();
      g.fillStyle = "#4ca368";
      for (let k = 1; k <= 4; k++) {
        const ly = -s * (0.14 * k), lw = s * (0.18 - k * 0.025);
        g.beginPath(); g.ellipse(-lw * 0.7, ly, lw, lw * 0.36, -0.35, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(lw * 0.7, ly, lw, lw * 0.36, 0.35, 0, TAU); g.fill();
      }
      g.restore();
    });
    g.restore();
  }

  function drawMushroom(m) {
    const x = m.nx * W, y = m.ny * H, s = clamp(S * 0.034, 15, 28);
    const pulse = still ? 1 : 0.88 + 0.12 * Math.sin(time * 2.4 + m.ph);
    // Glød omkring svampen
    const gl = g.createRadialGradient(x, y - s * 0.7, 0, x, y - s * 0.7, s * (2.2 + m.glow * 2.2));
    gl.addColorStop(0, m.col + "aa");
    gl.addColorStop(1, m.col + "00");
    g.save(); g.globalAlpha = m.glow * pulse;
    g.fillStyle = gl; g.beginPath(); g.arc(x, y - s * 0.7, s * 4.4, 0, TAU); g.fill();
    g.restore();

    // To små svampe sammen
    [[0, 0, 1], [s * 0.75, s * 0.12, 0.65]].forEach(([dx, dy, sc]) => {
      const r = s * sc;
      g.fillStyle = "#e8e4d5";
      rrect(g, x + dx - r * 0.18, y + dy - r * 0.75, r * 0.36, r * 0.8, r * 0.12); g.fill();
      g.fillStyle = m.col;
      g.beginPath(); g.ellipse(x + dx, y + dy - r * 0.72, r * 0.65, r * 0.44, 0, Math.PI, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.beginPath(); g.arc(x + dx - r * 0.22, y + dy - r * 0.92, r * 0.09, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + dx + r * 0.18, y + dy - r * 0.88, r * 0.07, 0, TAU); g.fill();
    });
  }

  /* ---------- De 8 skovdyr (bløde, tydelige vektor-illustrationer) ---------- */
  function drawAnimal(a) {
    const s = a.sz;
    const bounce = a.found ? (still ? 1 : 0.9 + 0.1 * a.pop + Math.sin(a.pop * Math.PI) * 0.16) : 0.72 + a.charge * 0.18;
    const hop = a.react > 0 ? Math.sin(a.react * Math.PI) * s * 0.2 : 0;
    const sway = still ? 0 : Math.sin(time * 2.1 + a.ph) * (a.found ? 0.045 : 0.015);
    const id = a.data.id;

    g.save();
    g.translate(a.x, a.y - hop);
    g.scale(bounce, bounce);
    g.rotate(sway);

    // Blød skygge under dyret
    if (id !== "ugle") {
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.beginPath(); g.ellipse(0, s * 0.24, s * 0.42, s * 0.1, 0, 0, TAU); g.fill();
    }

    const eye = (ex, ey, er) => {
      g.fillStyle = "#181d2c"; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex - er * 0.3, ey - er * 0.3, er * 0.36, 0, TAU); g.fill();
    };
    const cheek = (cx, cy, cr) => {
      g.fillStyle = "rgba(255,140,155,0.45)"; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
    };

    if (id === "ugle") {
      const flap = a.react > 0 ? Math.sin(a.react * Math.PI * 3) * 0.35 : 0;
      // Øretotter
      g.fillStyle = "#8a5a3c";
      g.beginPath(); g.moveTo(-s * 0.28, -s * 0.32); g.lineTo(-s * 0.38, -s * 0.56); g.lineTo(-s * 0.12, -s * 0.42); g.fill();
      g.beginPath(); g.moveTo(s * 0.28, -s * 0.32); g.lineTo(s * 0.38, -s * 0.56); g.lineTo(s * 0.12, -s * 0.42); g.fill();
      // Krop & mave
      g.fillStyle = "#9d6a48"; g.beginPath(); g.ellipse(0, -s * 0.04, s * 0.38, s * 0.42, 0, 0, TAU); g.fill();
      g.fillStyle = "#ecd6b6"; g.beginPath(); g.ellipse(0, s * 0.08, s * 0.25, s * 0.26, 0, 0, TAU); g.fill();
      // Vinger
      g.save(); g.translate(-s * 0.34, -s * 0.04); g.rotate(0.2 + flap);
      g.fillStyle = "#7c4e33"; g.beginPath(); g.ellipse(0, s * 0.08, s * 0.13, s * 0.25, 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.translate(s * 0.34, -s * 0.04); g.rotate(-0.2 - flap);
      g.fillStyle = "#7c4e33"; g.beginPath(); g.ellipse(0, s * 0.08, s * 0.13, s * 0.25, 0, 0, TAU); g.fill(); g.restore();
      // Store gyldne ugleøjne
      g.fillStyle = "#ffe074";
      g.beginPath(); g.arc(-s * 0.15, -s * 0.16, s * 0.14, 0, TAU); g.arc(s * 0.15, -s * 0.16, s * 0.14, 0, TAU); g.fill();
      eye(-s * 0.15, -s * 0.16, s * 0.08); eye(s * 0.15, -s * 0.16, s * 0.08);
      // Næb
      g.fillStyle = "#f7a428"; g.beginPath(); g.moveTo(-s * 0.07, -s * 0.06); g.lineTo(s * 0.07, -s * 0.06); g.lineTo(0, s * 0.05); g.closePath(); g.fill();
    } else if (id === "froe") {
      // Bagben
      g.fillStyle = "#4da84c";
      g.beginPath(); g.ellipse(-s * 0.34, s * 0.14, s * 0.16, s * 0.12, -0.3, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(s * 0.34, s * 0.14, s * 0.16, s * 0.12, 0.3, 0, TAU); g.fill();
      // Krop & lys mave
      g.fillStyle = "#62c45b"; g.beginPath(); g.ellipse(0, s * 0.02, s * 0.38, s * 0.28, 0, 0, TAU); g.fill();
      g.fillStyle = "#d9f59d"; g.beginPath(); g.ellipse(0, s * 0.1, s * 0.26, s * 0.15, 0, 0, TAU); g.fill();
      // Øjenknopper
      g.fillStyle = "#62c45b";
      g.beginPath(); g.arc(-s * 0.18, -s * 0.22, s * 0.14, 0, TAU); g.arc(s * 0.18, -s * 0.22, s * 0.14, 0, TAU); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(-s * 0.18, -s * 0.22, s * 0.1, 0, TAU); g.arc(s * 0.18, -s * 0.22, s * 0.1, 0, TAU); g.fill();
      eye(-s * 0.18, -s * 0.22, s * 0.055); eye(s * 0.18, -s * 0.22, s * 0.055);
      // Stort smil + kinder
      cheek(-s * 0.24, 0, s * 0.07); cheek(s * 0.24, 0, s * 0.07);
      g.strokeStyle = "#204e23"; g.lineWidth = Math.max(2, s * 0.035); g.lineCap = "round";
      g.beginPath(); g.arc(0, -s * 0.02, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else if (id === "mus") {
      // Lille hale
      g.strokeStyle = "#e6a4a8"; g.lineWidth = Math.max(2, s * 0.04); g.lineCap = "round";
      g.beginPath(); g.moveTo(-s * 0.28, s * 0.12); g.quadraticCurveTo(-s * 0.56, s * 0.05, -s * 0.52, -s * 0.14); g.stroke();
      // Store runde ører
      g.fillStyle = "#a99fa8";
      g.beginPath(); g.arc(-s * 0.16, -s * 0.24, s * 0.17, 0, TAU); g.arc(s * 0.14, -s * 0.26, s * 0.17, 0, TAU); g.fill();
      g.fillStyle = "#f2b8c4";
      g.beginPath(); g.arc(-s * 0.16, -s * 0.24, s * 0.1, 0, TAU); g.arc(s * 0.14, -s * 0.26, s * 0.1, 0, TAU); g.fill();
      // Krop
      g.fillStyle = "#bab0ba"; g.beginPath(); g.ellipse(0, s * 0.02, s * 0.34, s * 0.24, 0, 0, TAU); g.fill();
      g.fillStyle = "#e6dde4"; g.beginPath(); g.ellipse(s * 0.05, s * 0.1, s * 0.2, s * 0.12, 0, 0, TAU); g.fill();
      // Øjne & lyserød snude
      eye(-s * 0.04, -s * 0.06, s * 0.055); eye(s * 0.18, -s * 0.06, s * 0.055);
      g.fillStyle = "#f28ca0"; g.beginPath(); g.arc(s * 0.34, s * 0.02, s * 0.065, 0, TAU); g.fill();
      // Knurhår
      g.strokeStyle = "rgba(255,255,255,0.65)"; g.lineWidth = 1.5;
      [-0.04, 0.04].forEach(dy => {
        g.beginPath(); g.moveTo(s * 0.3, s * 0.02); g.lineTo(s * 0.48, s * (0.02 + dy * 2)); g.stroke();
      });
    } else if (id === "bjoern") {
      // Runde bjørneører
      g.fillStyle = "#7a4e32";
      g.beginPath(); g.arc(-s * 0.26, -s * 0.42, s * 0.13, 0, TAU); g.arc(s * 0.26, -s * 0.42, s * 0.13, 0, TAU); g.fill();
      g.fillStyle = "#b5815c";
      g.beginPath(); g.arc(-s * 0.26, -s * 0.42, s * 0.07, 0, TAU); g.arc(s * 0.26, -s * 0.42, s * 0.07, 0, TAU); g.fill();
      // Hyggelig krop + mave
      g.fillStyle = "#8c5b3c"; g.beginPath(); g.ellipse(0, s * 0.05, s * 0.4, s * 0.34, 0, 0, TAU); g.fill();
      g.fillStyle = "#c89972"; g.beginPath(); g.ellipse(0, s * 0.11, s * 0.24, s * 0.2, 0, 0, TAU); g.fill();
      // Hoved
      g.fillStyle = "#8c5b3c"; g.beginPath(); g.arc(0, -s * 0.24, s * 0.29, 0, TAU); g.fill();
      // Snude
      g.fillStyle = "#dfb590"; g.beginPath(); g.ellipse(0, -s * 0.17, s * 0.14, s * 0.11, 0, 0, TAU); g.fill();
      g.fillStyle = "#2b1c14"; g.beginPath(); g.ellipse(0, -s * 0.21, s * 0.065, s * 0.045, 0, 0, TAU); g.fill();
      eye(-s * 0.12, -s * 0.3, s * 0.048); eye(s * 0.12, -s * 0.3, s * 0.048);
      cheek(-s * 0.18, -s * 0.2, s * 0.055); cheek(s * 0.18, -s * 0.2, s * 0.055);
      // Vinkende pote
      const wave = a.react > 0 ? Math.sin(a.react * Math.PI * 3) * 0.4 : 0;
      g.save(); g.translate(s * 0.34, -s * 0.02); g.rotate(-0.4 + wave);
      g.fillStyle = "#7a4e32"; g.beginPath(); g.ellipse(0, -s * 0.08, s * 0.11, s * 0.16, 0, 0, TAU); g.fill(); g.restore();
    } else if (id === "raev") {
      // Busket hale med hvid spids
      const swish = still ? 0 : Math.sin(time * 2.6 + a.ph) * 0.16 + (a.react > 0 ? 0.25 : 0);
      g.save(); g.translate(s * 0.24, s * 0.12); g.rotate(swish);
      g.fillStyle = "#e06d2f"; g.beginPath(); g.ellipse(s * 0.22, -s * 0.06, s * 0.28, s * 0.14, -0.35, 0, TAU); g.fill();
      g.fillStyle = "#fff5e6"; g.beginPath(); g.ellipse(s * 0.4, -s * 0.14, s * 0.12, s * 0.09, -0.35, 0, TAU); g.fill();
      g.restore();
      // Krop & hvidt bryst
      g.fillStyle = "#e06d2f"; g.beginPath(); g.ellipse(0, s * 0.06, s * 0.32, s * 0.26, 0, 0, TAU); g.fill();
      g.fillStyle = "#fff5e6"; g.beginPath(); g.ellipse(-s * 0.08, s * 0.08, s * 0.16, s * 0.18, 0, 0, TAU); g.fill();
      // Spidse ræveører
      g.fillStyle = "#c95820";
      g.beginPath(); g.moveTo(-s * 0.26, -s * 0.24); g.lineTo(-s * 0.34, -s * 0.52); g.lineTo(-s * 0.08, -s * 0.34); g.fill();
      g.beginPath(); g.moveTo(s * 0.1, -s * 0.24); g.lineTo(s * 0.18, -s * 0.52); g.lineTo(-s * 0.04, -s * 0.34); g.fill();
      // Hoved
      g.fillStyle = "#e87838"; g.beginPath(); g.ellipse(-s * 0.08, -s * 0.18, s * 0.26, s * 0.21, 0, 0, TAU); g.fill();
      g.fillStyle = "#fff5e6";
      g.beginPath(); g.ellipse(-s * 0.22, -s * 0.11, s * 0.13, s * 0.09, 0.2, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(s * 0.04, -s * 0.11, s * 0.13, s * 0.09, -0.2, 0, TAU); g.fill();
      eye(-s * 0.18, -s * 0.21, s * 0.045); eye(s * 0.02, -s * 0.21, s * 0.045);
      g.fillStyle = "#221a18"; g.beginPath(); g.arc(-s * 0.08, -s * 0.08, s * 0.048, 0, TAU); g.fill();
    } else if (id === "pindsvin") {
      // Pigge (blød brun vifte)
      g.fillStyle = "#5c4230";
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI * 0.92 + (i / 8) * Math.PI * 0.88;
        g.beginPath();
        g.moveTo(Math.cos(ang) * s * 0.16, Math.sin(ang) * s * 0.12);
        g.lineTo(Math.cos(ang) * s * 0.46, Math.sin(ang) * s * 0.4);
        g.lineTo(Math.cos(ang + 0.22) * s * 0.22, Math.sin(ang + 0.22) * s * 0.18);
        g.closePath(); g.fill();
      }
      g.fillStyle = "#7a5942"; g.beginPath(); g.ellipse(-s * 0.04, s * 0.02, s * 0.34, s * 0.24, 0, Math.PI, TAU); g.fill();
      // Blødt ansigt & krop
      g.fillStyle = "#d9be9e"; g.beginPath(); g.ellipse(s * 0.12, s * 0.08, s * 0.28, s * 0.18, 0, 0, TAU); g.fill();
      // Små ører, øjne & sort snude
      g.fillStyle = "#c2a280"; g.beginPath(); g.arc(s * 0.06, -s * 0.08, s * 0.065, 0, TAU); g.fill();
      eye(s * 0.18, s * 0.01, s * 0.045);
      cheek(s * 0.18, s * 0.09, s * 0.05);
      g.fillStyle = "#231a16"; g.beginPath(); g.arc(s * 0.39, s * 0.06, s * 0.05, 0, TAU); g.fill();
    } else if (id === "raadyr") {
      // Slanke ben
      g.strokeStyle = "#8a5a38"; g.lineWidth = Math.max(3, s * 0.07); g.lineCap = "round";
      [[-0.18, 0.08], [-0.04, 0.1], [0.16, 0.08], [0.28, 0.1]].forEach(([dx, dy]) => {
        g.beginPath(); g.moveTo(dx * s, dy * s); g.lineTo(dx * s, s * 0.34); g.stroke();
      });
      // Krop med hvide rådyr-prikker
      g.fillStyle = "#b87c4b"; g.beginPath(); g.ellipse(s * 0.08, s * 0.04, s * 0.34, s * 0.2, 0, 0, TAU); g.fill();
      g.fillStyle = "#fff0d6";
      [[0.02, -0.02], [0.15, -0.04], [0.24, 0.02], [0.1, 0.06]].forEach(([dx, dy]) => {
        g.beginPath(); g.arc(dx * s, dy * s, s * 0.04, 0, TAU); g.fill();
      });
      // Hals & hoved
      g.fillStyle = "#b87c4b";
      rrect(g, -s * 0.24, -s * 0.34, s * 0.16, s * 0.36, s * 0.08); g.fill();
      // Store opmærksomme ører
      g.fillStyle = "#a3683b";
      g.beginPath(); g.ellipse(-s * 0.28, -s * 0.48, s * 0.08, s * 0.16, -0.45, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-s * 0.04, -s * 0.48, s * 0.08, s * 0.16, 0.45, 0, TAU); g.fill();
      g.fillStyle = "#e8be9c";
      g.beginPath(); g.ellipse(-s * 0.28, -s * 0.48, s * 0.04, s * 0.09, -0.45, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-s * 0.04, -s * 0.48, s * 0.04, s * 0.09, 0.45, 0, TAU); g.fill();
      // Hoved
      g.fillStyle = "#c48856"; g.beginPath(); g.ellipse(-s * 0.16, -s * 0.34, s * 0.2, s * 0.16, 0, 0, TAU); g.fill();
      g.fillStyle = "#f2d6bc"; g.beginPath(); g.ellipse(-s * 0.28, -s * 0.29, s * 0.09, s * 0.07, 0, 0, TAU); g.fill();
      eye(-s * 0.14, -s * 0.36, s * 0.048);
      g.fillStyle = "#2b1d16"; g.beginPath(); g.arc(-s * 0.35, -s * 0.3, s * 0.042, 0, TAU); g.fill();
    } else if (id === "kanin") {
      // Lange kaninører
      const earWig = still ? 0 : Math.sin(time * 2.4 + a.ph) * 0.08;
      g.save(); g.translate(-s * 0.12, -s * 0.28); g.rotate(-0.18 + earWig);
      g.fillStyle = "#f2ece6"; g.beginPath(); g.ellipse(0, -s * 0.2, s * 0.095, s * 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = "#f5b8c6"; g.beginPath(); g.ellipse(0, -s * 0.2, s * 0.048, s * 0.16, 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.translate(s * 0.12, -s * 0.28); g.rotate(0.18 - earWig);
      g.fillStyle = "#f2ece6"; g.beginPath(); g.ellipse(0, -s * 0.2, s * 0.095, s * 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = "#f5b8c6"; g.beginPath(); g.ellipse(0, -s * 0.2, s * 0.048, s * 0.16, 0, 0, TAU); g.fill(); g.restore();
      // Rund krop + bomuldshale
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(s * 0.28, s * 0.12, s * 0.12, 0, TAU); g.fill();
      g.fillStyle = "#f2ece6"; g.beginPath(); g.ellipse(0, s * 0.06, s * 0.32, s * 0.26, 0, 0, TAU); g.fill();
      g.fillStyle = "#f7f3ee"; g.beginPath(); g.arc(0, -s * 0.16, s * 0.23, 0, TAU); g.fill();
      eye(-s * 0.1, -s * 0.18, s * 0.048); eye(s * 0.1, -s * 0.18, s * 0.048);
      cheek(-s * 0.16, -s * 0.1, s * 0.055); cheek(s * 0.16, -s * 0.1, s * 0.055);
      // Lyserød næse
      g.fillStyle = "#f58da8"; g.beginPath(); g.ellipse(0, -s * 0.11, s * 0.055, s * 0.04, 0, 0, TAU); g.fill();
    }

    g.restore();
  }

  /* ---------- Mørke-lag & lommelygte-kegle ---------- */
  function drawDarkness() {
    dg.save();
    dg.globalCompositeOperation = "source-over";
    dg.clearRect(0, 0, W, H);
    dg.fillStyle = `rgba(7, 11, 28, ${darkAlpha.toFixed(3)})`;
    dg.fillRect(0, 0, W, H);

    // Skær huller i mørket med destination-out
    dg.globalCompositeOperation = "destination-out";

    const punch = (x, y, r, strength = 1) => {
      const gr = dg.createRadialGradient(x, y, r * 0.08, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${strength})`);
      gr.addColorStop(0.58, `rgba(0,0,0,${strength * 0.72})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, r, 0, TAU); dg.fill();
    };

    // Hoved-lommelygte
    punch(beam.x, beam.y, beam.r * 1.12, 1);

    // Månen er altid blidt synlig på nattehimlen
    punch(moon.x, moon.y, moon.r * 3.4, 0.82);

    // Fundne dyr forbliver blidt oplyst og hyggelige i skoven
    animals.forEach(a => {
      if (a.found) punch(a.x, a.y - a.sz * 0.1, a.sz * 1.45, 0.72);
    });

    // Selvlysende svampe lyser svagt omkring sig
    mushrooms.forEach(m => {
      punch(m.nx * W, m.ny * H - 12, 34 + m.glow * 52, 0.35 + m.glow * 0.5);
    });

    // Ildfluer laver bittesmå lysprikker i mørket
    fireflies.forEach(f => punch(f.x, f.y, 26, 0.55));

    dg.restore();
    g.drawImage(darkCv, 0, 0, W, H);

    // Varm gylden lommelygte-glød ovenpå mørket
    const halo = g.createRadialGradient(beam.x, beam.y, beam.r * 0.05, beam.x, beam.y, beam.r * 1.05);
    halo.addColorStop(0, "rgba(255,244,195,0.22)");
    halo.addColorStop(0.55, "rgba(255,222,135,0.09)");
    halo.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = halo; g.beginPath(); g.arc(beam.x, beam.y, beam.r * 1.05, 0, TAU); g.fill();
  }

  /* ---------- Blinkende øjne i mørket (tegnes OVER mørket) ---------- */
  function drawHiddenEyes() {
    animals.forEach(a => {
      if (a.found) return;
      const ex = a.x + a.data.eyeOff[0] * a.sz;
      const ey = a.y + a.data.eyeOff[1] * a.sz;
      const dist = Math.hypot(beam.x - a.x, beam.y - (a.y - a.sz * 0.15));
      const near = clamp(1 - dist / (beam.r * 1.35), 0, 1);

      // Blid gylden glød når dyret er ved at blive opdaget eller kaldt på
      if (a.charge > 0.02 || a.hintGlow > 0) {
        const ringR = a.sz * (0.45 + a.charge * 0.35 + (a.hintGlow > 0 ? Math.sin(time * 6) * 0.08 : 0));
        const alpha = Math.max(a.charge * 0.75, clamp(a.hintGlow / 2.5, 0, 0.65));
        g.strokeStyle = `rgba(255,235,140,${alpha})`;
        g.lineWidth = 3;
        g.beginPath(); g.arc(a.x, a.y - a.sz * 0.12, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * (a.charge > 0.02 ? a.charge : 1)); g.stroke();
      }

      // Hvis lyset er helt tæt på, ser barnet allerede dyrets rigtige øjne — ellers kigger øjnene i mørket
      if (near > 0.72) return;
      const eyeAlpha = (1 - near * 0.9) * (a.hintGlow > 0 ? 1 : 0.78);
      const sep = clamp(a.sz * 0.15, 7, 13);
      const r = clamp(a.sz * 0.065, 3.5, 5.8) * (a.hintGlow > 0 ? 1.25 : 1);

      g.save();
      g.globalAlpha = eyeAlpha;
      if (a.blinkDur > 0) {
        // Lukkede øjne (blidt blink)
        g.strokeStyle = "#ffe58a"; g.lineWidth = 2.2; g.lineCap = "round";
        g.beginPath();
        g.moveTo(ex - sep - r, ey); g.lineTo(ex - sep + r, ey);
        g.moveTo(ex + sep - r, ey); g.lineTo(ex + sep + r, ey);
        g.stroke();
      } else {
        // Lysende nysgerrige øjne i mørket
        g.fillStyle = "#ffe98c";
        g.beginPath(); g.ellipse(ex - sep, ey, r, r * 1.12, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(ex + sep, ey, r, r * 1.12, 0, 0, TAU); g.fill();
        g.fillStyle = "#161a2e";
        g.beginPath(); g.arc(ex - sep, ey, r * 0.45, 0, TAU); g.arc(ex + sep, ey, r * 0.45, 0, TAU); g.fill();
      }
      g.restore();
    });
  }

  function drawFirefliesAndParticles() {
    // Ildfluer ovenpå mørket så de lyser magisk
    fireflies.forEach(f => {
      const pulse = still ? 0.85 : 0.55 + 0.45 * Math.sin(time * f.sp + f.ph);
      const r = 13 + pulse * 8;
      const gl = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gl.addColorStop(0, f.col);
      gl.addColorStop(0.35, f.col + "66");
      gl.addColorStop(1, f.col + "00");
      g.fillStyle = gl; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(f.x, f.y, 2.2, 0, TAU); g.fill();
    });

    // Stjerne-gnister
    particles.forEach(p => {
      const f = 1 - p.life / p.max;
      const r = p.r * (0.4 + f * 0.8);
      g.save(); g.globalAlpha = f; g.fillStyle = p.col;
      g.beginPath();
      g.moveTo(p.x, p.y - r * 2); g.quadraticCurveTo(p.x, p.y, p.x + r * 2, p.y);
      g.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2); g.quadraticCurveTo(p.x, p.y, p.x - r * 2, p.y);
      g.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2); g.fill();
      g.restore();
    });
  }

  function draw() {
    drawSky();
    drawForest();
    animals.forEach(drawAnimal);
    drawDarkness();
    drawHiddenEyes();
    drawFirefliesAndParticles();
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Finger & mus ---------- */
  function down(e) {
    if (celebrate && canRestart) { startRound(false); return; }
    if (pointerId != null && e.pointerId !== pointerId) return;
    pointerId = e.pointerId; holding = true; pointerActive = true;
    beam.tx = e.clientX; beam.ty = e.clientY;
    idleAfter = time + 6;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function move(e) {
    if (e.pointerType === "mouse") {
      pointerActive = true; beam.tx = e.clientX; beam.ty = e.clientY; idleAfter = time + 8;
    } else if (holding && e.pointerId === pointerId) {
      beam.tx = e.clientX; beam.ty = e.clientY; idleAfter = time + 6;
    }
  }
  function up(e) {
    if (e.pointerId === pointerId) { holding = false; pointerId = null; idleAfter = time + 4.5; }
  }

  Spil.register({
    id: "lommelygten", navn: "Lommelygten", ikon: "🔦", farve: "#b8c4f2",
    start(r) {
      Spil.preload([
        "lommelygt-hej", "lommelygt-hint", "lommelygt-maane", "lommelygt-godnat", "lommelygt-ny",
        "lommelygt-ugle", "dyr-ugle", "lommelygt-froe", "dyr-froe", "lommelygt-mus", "dyr-mus",
        "lommelygt-bjoern", "lommelygt-raev", "lommelygt-pindsvin", "lommelygt-raadyr", "lommelygt-kanin",
      ]);
      alive = true; timers = [];
      r.innerHTML = `<div class="ll">
        <canvas aria-label="Natteskov med lommelygte"></canvas>
        <div class="ll-jar" aria-label="Fundne dyr">
          <svg class="ll-jar-ico" viewBox="0 0 36 42" aria-hidden="true">
            <rect x="10" y="2" width="16" height="5" rx="2" fill="#d9a85b"/>
            <rect x="7" y="7" width="22" height="31" rx="8" fill="rgba(255,244,195,.2)" stroke="rgba(255,235,165,.75)" stroke-width="2.2"/>
            <circle cx="15" cy="24" r="3.2" fill="#ffe57a"/>
            <circle cx="22" cy="19" r="2.4" fill="#c8ff78"/>
            <circle cx="19" cy="29" r="2" fill="#fff2a6"/>
          </svg>
          <div class="ll-dots"></div>
        </div>
        <button class="ll-hint" aria-label="Hvem gemmer sig i skoven?">✨</button>
        <button class="ll-again" aria-label="En ny nat i skoven">🌙</button>
      </div>`;

      root = r.querySelector(".ll");
      cv = root.querySelector("canvas");
      jarEl = root.querySelector(".ll-jar");
      dotsEl = root.querySelector(".ll-dots");
      hintBtn = root.querySelector(".ll-hint");
      againBtn = root.querySelector(".ll-again");
      g = cv.getContext("2d");
      darkCv = document.createElement("canvas");
      dg = darkCv.getContext("2d");

      time = 0; last = performance.now();
      holding = false; pointerId = null; pointerActive = false; idleAfter = 0;
      lastRustleT = -9; nightsDone = loadNights();
      const dyb = Spil.dyb || "";
      revealAll = dyb === "lys";

      beam = { x: innerWidth * 0.5, y: innerHeight * 0.6, tx: innerWidth * 0.5, ty: innerHeight * 0.6, r: 150 };
      resize();
      buildScenery();
      startRound(true);

      addEventListener("resize", resize);
      cv.addEventListener("pointerdown", down);
      cv.addEventListener("pointermove", move);
      cv.addEventListener("pointerup", up);
      cv.addEventListener("pointercancel", up);
      hintBtn.onclick = triggerHint;
      againBtn.onclick = () => startRound(false);

      startAudio();

      if (dyb === "fest") {
        animals.forEach(a => { a.found = true; a.charge = 1; a.pop = 1; });
        renderHud();
        startCelebration();
      } else {
        later(() => Spil.say("Godaften! Lys med lommelygten i skoven, og find dyrene!", null, "lommelygt-hej"), 450);
      }
      raf = requestAnimationFrame(frame);
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      stopAudio();
    },
  });
})();
