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
  const STORAGE_KEY = "lk-lommelygten";
  const FIND_TIME = 0.45; // sekunder med lys på et dyr før det kommer frem
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
  const BG_W = 2880, BG_H = 1920;

  // 3 natte-scener i 4K billedbogsstil med egne dyr, forgrunds-indfletning og små natur-fakta
  const SCENER = {
    skov: {
      id: "skov", navn: "Natteskoven", ikon: "🌲",
      bg: "billeder/lommelygten/skov-bg.webp",
      intro: ["Nu er vi i natteskoven! Hvem gemmer sig her?", "lommelygt-scene-skov"],
      moon: [0.415, 0.210],
      dyr: [
        { id: "ugle", navn: "uglen", replik: "Se, det er uglen!", lyd: ["lommelygt-ugle", "dyr-ugle"], pos: [0.172, 0.282], sc: 0.78, eyeY: 0.312, tuck: 0.24, fakta: ["Uglen er vågen om natten, og den kan se rigtig godt i mørke.", "lommelygt-fakta-ugle"] },
        { id: "froe", navn: "frøen", replik: "Se, det er frøen!", lyd: ["lommelygt-froe", "dyr-froe"], pos: [0.715, 0.835], sc: 0.76, eyeY: 0.212, tuck: 0.08, fakta: ["Frøen kan både svømme under vand og hoppe højt på land.", "lommelygt-fakta-froe"] },
        { id: "mus", navn: "musen", replik: "Se, det er den lille mus!", lyd: ["lommelygt-mus", "dyr-mus"], pos: [0.272, 0.782], sc: 0.70, eyeY: 0.352, tuck: 0.22 },
        { id: "bjoern", navn: "bjørnen", replik: "Se, det er bjørnen!", lyd: "lommelygt-bjoern", pos: [0.245, 0.515], sc: 0.90, eyeY: 0.37, tuck: 0.26 },
        { id: "raev", navn: "ræven", replik: "Se, det er ræven!", lyd: "lommelygt-raev", pos: [0.848, 0.612], sc: 0.88, eyeY: 0.329, tuck: 0.22 },
        { id: "pindsvin", navn: "pindsvinet", replik: "Se, det er pindsvinet!", lyd: "lommelygt-pindsvin", pos: [0.435, 0.842], sc: 0.74, eyeY: 0.549, tuck: 0.16, fakta: ["Pindsvinet kan rulle sig sammen til en lille kugle med pigge.", "lommelygt-fakta-pindsvin"] },
        { id: "raadyr", navn: "rådyret", replik: "Se, det er rådyret!", lyd: "lommelygt-raadyr", pos: [0.635, 0.555], sc: 1.00, eyeY: 0.36, tuck: 0.12 },
        { id: "kanin", navn: "kaninen", replik: "Se, det er kaninen!", lyd: "lommelygt-kanin", pos: [0.465, 0.632], sc: 0.80, eyeY: 0.499, tuck: 0.24 },
      ],
      hemmeligheder: [
        { nx: 0.725, ny: 0.415, r: 0.090, col: "#ffd46b", kind: "lantern", baseGlow: 0.34 },
        { nx: 0.375, ny: 0.795, r: 0.065, col: "#ffe28a", kind: "lantern", baseGlow: 0.42 },
        { nx: 0.555, ny: 0.895, r: 0.085, col: "#6ef7e2", kind: "glow",    baseGlow: 0.40, fakta: ["Nogle svampe i skoven kan faktisk lyse helt selv i mørket!", "lommelygt-fakta-svampe"] },
        { nx: 0.795, ny: 0.800, r: 0.085, col: "#fff0a8", kind: "ripple",  baseGlow: 0.28, fakta: ["Se! Stille vand virker ligesom et spejl for månen.", "lommelygt-fakta-dam"] },
        { nx: 0.095, ny: 0.815, r: 0.070, col: "#ff9b70", kind: "glow",    baseGlow: 0.14 },
        { nx: 0.775, ny: 0.125, r: 0.080, col: "#d6ecff", kind: "star",    baseGlow: 0.18, fakta: ["Se stjernerne! De er kæmpestore sole, der er helt vildt langt væk.", "lommelygt-fakta-stjerner"] },
      ],
    },
    bondegaard: {
      id: "bondegaard", navn: "Bondegården", ikon: "🚜",
      bg: "billeder/lommelygten/bondegaard-bg.webp",
      intro: ["Nu er vi på bondegården om natten! Hvem gemmer sig her?", "lommelygt-scene-bondegaard"],
      moon: [0.568, 0.145],
      dyr: [
        { id: "kat", navn: "katten", replik: "Se, det er katten!", lyd: ["lommelygt-kat", "dyr-kat"], pos: [0.215, 0.258], sc: 0.78, eyeY: 0.278, tuck: 0.26, fakta: ["Katten bruger sine knurhår til at mærke sig frem i mørket.", "lommelygt-fakta-kat"] },
        { id: "hund", navn: "hunden", replik: "Se, det er hunden!", lyd: ["lommelygt-hund", "dyr-hund"], pos: [0.165, 0.560], sc: 0.84, eyeY: 0.275, tuck: 0.20 },
        { id: "gris", navn: "grisen", replik: "Se, det er grisen!", lyd: ["lommelygt-gris", "dyr-gris"], pos: [0.455, 0.820], sc: 0.80, eyeY: 0.320, tuck: 0.24 },
        { id: "ko", navn: "koen", replik: "Se, det er koen!", lyd: ["lommelygt-ko", "dyr-ko"], pos: [0.635, 0.535], sc: 0.96, eyeY: 0.345, tuck: 0.22 },
        { id: "hest", navn: "hesten", replik: "Se, det er hesten!", lyd: ["lommelygt-hest", "dyr-hest"], pos: [0.790, 0.505], sc: 0.96, eyeY: 0.307, tuck: 0.24 },
        { id: "faar", navn: "fåret", replik: "Se, det er fåret!", lyd: ["lommelygt-faar", "dyr-faar"], pos: [0.115, 0.790], sc: 0.84, eyeY: 0.335, tuck: 0.26, fakta: ["Fåret har tyk, varm uld, som man kan strikke en trøje af.", "lommelygt-fakta-faar"] },
        { id: "hoene", navn: "hønen", replik: "Se, det er hønen!", lyd: ["lommelygt-hoene", "dyr-hoene"], pos: [0.930, 0.558], sc: 0.74, eyeY: 0.283, tuck: 0.22, fakta: ["Hønen lægger æg inde i hønsehuset!", "lommelygt-fakta-hoene"] },
        { id: "and", navn: "anden", replik: "Se, det er anden!", lyd: ["lommelygt-and", "dyr-and"], pos: [0.715, 0.795], sc: 0.76, eyeY: 0.270, tuck: 0.14 },
      ],
      hemmeligheder: [
        { nx: 0.400, ny: 0.555, r: 0.110, col: "#ffe680", kind: "lantern", baseGlow: 0.30, fakta: ["Traktoren har store hjul, så den kan køre ude på mudrede marker.", "lommelygt-fakta-traktor"] },
        { nx: 0.118, ny: 0.415, r: 0.075, col: "#ffd46b", kind: "lantern", baseGlow: 0.38 },
        { nx: 0.812, ny: 0.655, r: 0.060, col: "#ffe28a", kind: "lantern", baseGlow: 0.36 },
        { nx: 0.785, ny: 0.785, r: 0.085, col: "#fff0a8", kind: "ripple",  baseGlow: 0.28, fakta: ["Se! Stille vand virker ligesom et spejl for månen.", "lommelygt-fakta-dam"] },
        { nx: 0.825, ny: 0.220, r: 0.080, col: "#ff9b7a", kind: "glow",    baseGlow: 0.14 },
        { nx: 0.385, ny: 0.125, r: 0.080, col: "#d6ecff", kind: "star",    baseGlow: 0.18, fakta: ["Se stjernerne! De er kæmpestore sole, der er helt vildt langt væk.", "lommelygt-fakta-stjerner"] },
      ],
    },
    jungle: {
      id: "jungle", navn: "Nattejunglen", ikon: "🌿",
      bg: "billeder/lommelygten/jungle-bg.webp",
      intro: ["Nu er vi i nattejunglen! Hvem gemmer sig her?", "lommelygt-scene-jungle"],
      moon: [0.440, 0.220],
      dyr: [
        { id: "abe", navn: "aben", replik: "Se, det er aben!", lyd: ["lommelygt-abe", "dyr-abe"], pos: [0.225, 0.260], sc: 0.80, eyeY: 0.350, tuck: 0.20 },
        { id: "papegoeje", navn: "papegøjen", replik: "Se, det er papegøjen!", lyd: "lommelygt-papegoeje", pos: [0.715, 0.255], sc: 0.78, eyeY: 0.238, tuck: 0.16 },
        { id: "dovendyr", navn: "dovendyret", replik: "Se, det er dovendyret!", lyd: "lommelygt-dovendyr", pos: [0.875, 0.205], sc: 0.82, eyeY: 0.271, tuck: 0.20, fakta: ["Dovendyret hænger på hovedet og bevæger sig helt vildt langsomt.", "lommelygt-fakta-dovendyr"] },
        { id: "tiger", navn: "tigeren", replik: "Se, det er tigeren!", lyd: "lommelygt-tiger", pos: [0.255, 0.585], sc: 0.88, eyeY: 0.362, tuck: 0.26, fakta: ["Ingen tigre har helt ens striber — hver tiger har sit eget mønster!", "lommelygt-fakta-tiger"] },
        { id: "tukan", navn: "tukanen", replik: "Se, det er tukanen!", lyd: "lommelygt-tukan", pos: [0.585, 0.435], sc: 0.78, eyeY: 0.275, tuck: 0.20 },
        { id: "slange", navn: "slangen", replik: "Se, det er slangen!", lyd: ["lommelygt-slange", "dyr-slange"], pos: [0.165, 0.815], sc: 0.78, eyeY: 0.212, tuck: 0.18 },
        { id: "kamaeleon", navn: "kamæleonen", replik: "Se, det er kamæleonen!", lyd: "lommelygt-kamaeleon", pos: [0.435, 0.810], sc: 0.78, eyeY: 0.338, tuck: 0.22, fakta: ["Kamæleonen kan skifte farve, så den gemmer sig mellem bladene!", "lommelygt-fakta-kamaeleon"] },
        { id: "panter", navn: "panteren", replik: "Se, det er panteren!", lyd: "lommelygt-panter", pos: [0.885, 0.655], sc: 0.86, eyeY: 0.318, tuck: 0.24 },
      ],
      hemmeligheder: [
        { nx: 0.590, ny: 0.635, r: 0.085, col: "#ffe066", kind: "lantern", baseGlow: 0.40 },
        { nx: 0.790, ny: 0.460, r: 0.100, col: "#8cf5ff", kind: "ripple",  baseGlow: 0.32, fakta: ["Et vandfald er en flod, der falder ud over en høj klippe.", "lommelygt-fakta-vandfald"] },
        { nx: 0.680, ny: 0.835, r: 0.085, col: "#80fff4", kind: "ripple",  baseGlow: 0.28 },
        { nx: 0.460, ny: 0.780, r: 0.080, col: "#ff7ee2", kind: "glow",    baseGlow: 0.34 },
        { nx: 0.325, ny: 0.170, r: 0.075, col: "#d29eff", kind: "glow",    baseGlow: 0.22 },
        { nx: 0.565, ny: 0.135, r: 0.080, col: "#d6ecff", kind: "star",    baseGlow: 0.18, fakta: ["Se stjernerne! De er kæmpestore sole, der er helt vildt langt væk.", "lommelygt-fakta-stjerner"] },
      ],
    },
  };
  const SCENE_LIST = [SCENER.skov, SCENER.bondegaard, SCENER.jungle];
  let curScene = SCENER.skov;
  const sprites = {};
  const bgImgs = {};
  function loadSceneAssets(sc) {
    if (!bgImgs[sc.id]) {
      const im = new Image();
      im.src = sc.bg;
      bgImgs[sc.id] = im;
    }
    sc.dyr.forEach(d => {
      if (sprites[d.id]) return;
      const full = new Image(), eyes = new Image();
      full.src = `billeder/lommelygten/${d.id}.webp`;
      eyes.src = `billeder/lommelygten/${d.id}-oejne.webp`;
      sprites[d.id] = { full, eyes };
    });
  }

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
    .ll-scenes{position:absolute;z-index:7;bottom:calc(2.4vh + env(safe-area-inset-bottom,0px));left:max(16px,env(safe-area-inset-left,0px));
      display:flex;gap:clamp(8px,1.2vmin,12px);padding:6px;border-radius:999px;
      background:rgba(16,24,54,.64);box-shadow:inset 0 0 0 2px rgba(255,232,150,.28),0 8px 22px rgba(0,0,0,.4);
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
    .ll-scenes button{width:clamp(56px,7.8vh,72px);aspect-ratio:1;border-radius:50%;
      background:rgba(255,255,255,.10);font-size:clamp(26px,4vh,36px);display:grid;place-items:center;
      transition:transform .16s,background .2s,box-shadow .2s}
    .ll-scenes button.on{background:radial-gradient(circle at 35% 30%,#fff6c8,#ffd25a 65%,#e4a628);
      box-shadow:0 4px 0 #9f6d10,0 0 18px rgba(255,216,100,.55);transform:scale(1.06)}
    .ll-scenes button:active{transform:scale(.94)}
    @media (prefers-reduced-motion:reduce){.ll-jar,.ll-dots i,.ll-hint,.ll-again,.ll-scenes button{transition:none}}
  `);

  let root, cv, g, darkCv, dg, jarEl, dotsEl, hintBtn, againBtn, scenesEl;
  let alive, raf, timers, W, H, S, dpr, last, time, portrait, panX;
  let beam, holding, pointerId, pointerActive, idleAfter;
  let secrets, fireflies, particles, shootingStars, ripples, animals;
  let moon, celebrate, celebrateT, canRestart, darkAlpha, autoHintT, lastRustleT;
  let nightsDone, audio, revealAll, saidFacts, lastFactT;
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

  /* ---------- Opsætning af scene, kamera & runde ---------- */
  function bgBox() {
    const scale = Math.max(W / BG_W, H / BG_H);
    const bw = BG_W * scale, bh = BG_H * scale;
    const ox = -(bw - W) * panX;
    const oy = -(bh - H) * 0.5;
    return { ox, oy, bw, bh, scale };
  }
  function toScreen(nx, ny) {
    const b = bgBox();
    return { x: b.ox + nx * b.bw, y: b.oy + ny * b.bh };
  }

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
      beam.r = clamp(S * 0.185, 88, 152);
      beam.x = clamp(beam.x, 0, W); beam.y = clamp(beam.y, 0, H);
      beam.tx = clamp(beam.tx, 0, W); beam.ty = clamp(beam.ty, 0, H);
    }
    syncScenePositions();
  }

  function syncScenePositions() {
    moon = moon || { smile: 0, glow: 0, lastTalk: -99 };
    const mp = toScreen(curScene.moon[0], curScene.moon[1]);
    moon.x = mp.x; moon.y = mp.y;
    moon.r = clamp(S * 0.052, 22, 42);
    if (!animals) return;
    const baseSz = clamp(S * 0.092, 46, 76);
    animals.forEach(a => {
      const p = toScreen(a.data.pos[0], a.data.pos[1]);
      a.x = p.x; a.y = p.y;
      a.sz = baseSz * (a.data.sc || 1);
    });
  }

  function buildScenery() {
    secrets = curScene.hemmeligheder.map((h, i) => ({
      ...h, glow: h.baseGlow, lit: 0, cooldown: 0, ph: i * 1.7,
    }));
    fireflies = Array.from({ length: still ? 7 : 14 }, (_, i) => makeFirefly(i));
    shootingStars = [];
    ripples = [];
  }

  function spawnShootingStar() {
    if (still) return;
    shootingStars.push({
      x: W * (0.2 + Math.random() * 0.45),
      y: H * (0.06 + Math.random() * 0.14),
      vx: 360 + Math.random() * 180,
      vy: 95 + Math.random() * 70,
      life: 0, max: 0.85,
    });
  }

  function makeFirefly(seed) {
    return {
      x: (0.10 + Math.random() * 0.80) * (W || 1000),
      y: (0.22 + Math.random() * 0.62) * (H || 800),
      vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 14,
      ph: Math.random() * TAU, sp: 1.8 + Math.random() * 2,
      toJar: false, jarT: 0, sx: 0, sy: 0,
      col: seed % 3 === 0 ? "#c8ff78" : "#ffe97d",
    };
  }

  function startRound(isFirst) {
    celebrate = false; celebrateT = 0; canRestart = false;
    darkAlpha = revealAll ? 0.12 : 0.91;
    againBtn.classList.remove("show");
    hintBtn.hidden = false;
    particles = [];
    shootingStars = [];
    ripples = [];
    fireflies = Array.from({ length: still ? 7 : 14 }, (_, i) => makeFirefly(i));

    const pool = Spil.shuffle(curScene.dyr.slice());
    animals = pool.map((data, i) => ({
      data, x: 0, y: 0, sz: 64,
      found: revealAll, charge: revealAll ? 1 : 0, pop: revealAll ? 1 : 0,
      react: 0, reactCool: 0, hintGlow: 0,
      blinkT: 1 + Math.random() * 3.5, blinkDur: 0,
      ph: i * 1.3 + Math.random() * 2,
    }));
    syncScenePositions();
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

  function tryFact(fakta) {
    if (!fakta || celebrate || Spil.isTalking()) return false;
    const [tekst, key] = fakta;
    if (saidFacts.has(key) || time - lastFactT < 4.5) return false;
    lastFactT = time;
    // Markér først fakta som hørt, når sætningen får lov at tale færdig (bliver den afbrudt, kan barnet høre den igen!)
    Spil.say(tekst, () => { saidFacts.add(key); }, key);
    return true;
  }

  function switchScene(scId, speakIntro = true) {
    const sc = SCENER[scId];
    if (!sc) return;
    curScene = sc;
    panX = 0.5;
    loadSceneAssets(curScene);
    const preloadKeys = curScene.dyr.flatMap(d => (Array.isArray(d.lyd) ? d.lyd : [d.lyd]).concat(d.fakta ? [d.fakta[1]] : []));
    curScene.hemmeligheder.forEach(h => { if (h.fakta) preloadKeys.push(h.fakta[1]); });
    Spil.preload(preloadKeys);
    if (scenesEl) {
      scenesEl.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.sc === curScene.id));
    }
    buildScenery();
    startRound(true);
    if (speakIntro) Spil.say(curScene.intro[0], null, curScene.intro[1]);
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

    // På smal telefon-skærm panorerer scenen blidt med lommelygten, så man kan udforske hele skoven
    const targetPan = portrait ? clamp(beam.x / Math.max(1, W), 0, 1) : 0.5;
    panX = lerp(panX, targetPan, 1 - Math.exp(-dt * (portrait ? 3.5 : 6)));
    syncScenePositions();

    // Mørket løfter sig blidt under nattefesten
    const targetDark = celebrate || revealAll ? 0.14 : 0.91;
    darkAlpha = lerp(darkAlpha, targetDark, 1 - Math.exp(-dt * 2.2));
    if (celebrate) celebrateT += dt;

    // Månen: glimter, sender et stjerneskud og hilser når man lyser på den
    const md = Math.hypot(beam.x - moon.x, beam.y - moon.y);
    const moonLit = md < beam.r * 0.88;
    moon.glow = lerp(moon.glow, moonLit || celebrate ? 1 : 0, 1 - Math.exp(-dt * 4));
    if (moonLit && moon.smile <= 0.15) {
      moon.smile = 3.5;
      spawnShootingStar();
      chime(1046.5, 0.1, 1.3, 0); chime(1318.5, 0.08, 1.4, 0.12);
      spawnSparkles(moon.x, moon.y, 12, "#fff5b8");
      if (!tryFact(["Se månen! Den lyser, fordi solen skinner på den.", "lommelygt-fakta-maane"])) {
        if (!Spil.isTalking() && time - moon.lastTalk > 22) {
          moon.lastTalk = time;
          Spil.say("Hej måne! Hvor skinner du flot!", null, "lommelygt-maane");
        }
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
          a.react = 1; a.reactCool = 2.8;
          spawnSparkles(a.x, a.y - a.sz * 0.25, 7, "#ffe680");
          playAnimalSynth(a.data.id);
          if (a.data.fakta) tryFact(a.data.fakta);
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

    // Interaktive hemmeligheder i scenen (hytte-lanterne, lysende svampe, månespejling i dammen m.m.)
    secrets.forEach((m, i) => {
      const mp = toScreen(m.nx, m.ny);
      const lit = Math.hypot(beam.x - mp.x, beam.y - mp.y) < Math.max(beam.r * 0.82, bgBox().bw * m.r);
      if (m.cooldown > 0) m.cooldown = Math.max(0, m.cooldown - dt);
      m.dwell = lit ? (m.dwell || 0) + dt : 0;
      if (m.dwell >= 0.32 && m.fakta) tryFact(m.fakta);
      if (lit && m.cooldown <= 0) {
        m.lit = 1; m.cooldown = 1.9;
        if (m.kind === "lantern") {
          chime(523.25, 0.09, 1.4, 0); chime(659.25, 0.08, 1.4, 0.11);
          spawnSparkles(mp.x, mp.y - 6, 10, m.col);
        } else if (m.kind === "ripple") {
          chime(880, 0.08, 1.4, 0); chime(1174.66, 0.07, 1.4, 0.12);
          ripples.push({ x: mp.x, y: mp.y, life: 0, max: 1.5 });
          spawnSparkles(mp.x, mp.y, 8, m.col);
        } else if (m.kind === "star") {
          chime(1046.5, 0.08, 1.3, 0); chime(1567.98, 0.07, 1.4, 0.1);
          spawnShootingStar();
          spawnSparkles(mp.x, mp.y, 10, m.col);
        } else {
          chime(PENTATONIC[i % PENTATONIC.length], 0.09, 1.1, 0);
          spawnSparkles(mp.x, mp.y - 10, 7, m.col);
        }
        if (m.fakta) tryFact(m.fakta);
      }
      m.lit = Math.max(0, m.lit - dt * 0.45);
      m.glow = lerp(m.glow, lit || m.lit > 0 || celebrate ? 1 : m.baseGlow, 1 - Math.exp(-dt * 4.5));
    });

    // Stjerneskud & vandkrusninger
    shootingStars.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; });
    shootingStars = shootingStars.filter(s => s.life < s.max);
    ripples.forEach(r => { r.life += dt; });
    ripples = ripples.filter(r => r.life < r.max);

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

  /* ---------- Tegning af den illustrerede nattescene & hemmelige detaljer ---------- */
  function drawSceneBg() {
    const b = bgBox();
    const im = bgImgs[curScene.id];
    if (im && im.complete && im.naturalWidth) {
      g.drawImage(im, b.ox, b.oy, b.bw, b.bh);
    } else {
      g.fillStyle = "#0b132e";
      g.fillRect(0, 0, W, H);
    }

    // Blid nordlys-antydning i toppen under nattefesten (fader helt blødt ned til 0 uden skarp kant)
    if (celebrate) {
      const a = Math.min(0.30, celebrateT * 0.14);
      const ag = g.createLinearGradient(0, 0, 0, H * 0.52);
      ag.addColorStop(0, `rgba(90,235,195,${a})`);
      ag.addColorStop(0.45, `rgba(135,135,255,${a * 0.65})`);
      ag.addColorStop(1, "rgba(135,135,255,0)");
      g.fillStyle = ag; g.fillRect(0, 0, W, H * 0.55);
    }

    // Ekstra glød på månen & hemmelige detaljer (hytte-lanterne, svampe, dam-spejling)
    if (moon.glow > 0.05 || celebrate) {
      const gl = g.createRadialGradient(moon.x, moon.y, moon.r * 0.1, moon.x, moon.y, moon.r * (2.6 + moon.glow * 1.4));
      gl.addColorStop(0, `rgba(255,244,196,${0.25 + moon.glow * 0.35})`);
      gl.addColorStop(1, "rgba(255,244,196,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(moon.x, moon.y, moon.r * 4, 0, TAU); g.fill();
    }

    secrets.forEach(m => {
      const mp = toScreen(m.nx, m.ny);
      const pulse = still ? 1 : 0.88 + 0.12 * Math.sin(time * 2.4 + m.ph);
      const rad = b.bw * m.r * (0.75 + m.glow * 0.65);
      const gl = g.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, rad);
      gl.addColorStop(0, m.col + "cc");
      gl.addColorStop(0.45, m.col + "44");
      gl.addColorStop(1, m.col + "00");
      g.save();
      g.globalAlpha = clamp(m.glow * pulse * 0.85, 0, 0.95);
      g.fillStyle = gl; g.beginPath(); g.arc(mp.x, mp.y, rad, 0, TAU); g.fill();
      g.restore();
    });

    // Vandkrusninger i dammen
    ripples.forEach(r => {
      const f = r.life / r.max;
      g.save();
      g.strokeStyle = `rgba(255,244,190,${(1 - f) * 0.7})`;
      g.lineWidth = 2.2;
      g.beginPath();
      g.ellipse(r.x, r.y, 14 + f * 56, 6 + f * 22, 0, 0, TAU);
      g.stroke();
      g.restore();
    });

    // Stjerneskud på nattehimlen
    shootingStars.forEach(s => {
      const f = 1 - s.life / s.max;
      g.save();
      const grad = g.createLinearGradient(s.x, s.y, s.x - s.vx * 0.16, s.y - s.vy * 0.16);
      grad.addColorStop(0, `rgba(255,252,220,${f})`);
      grad.addColorStop(1, "rgba(255,252,220,0)");
      g.strokeStyle = grad; g.lineWidth = 3; g.lineCap = "round";
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.16, s.y - s.vy * 0.16); g.stroke();
      g.restore();
    });
  }

  /* ---------- De 8 skovdyr (billedbogs-sprites med rigtige gule øjne) ---------- */
  function animalPose(a) {
    const s = a.sz;
    const bounce = a.found ? (still ? 1 : 0.9 + 0.1 * a.pop + Math.sin(a.pop * Math.PI) * 0.16) : 0.72 + a.charge * 0.18;
    const hop = a.react > 0 ? Math.sin(a.react * Math.PI) * s * 0.2 : 0;
    const sway = still ? 0 : Math.sin(time * 2.1 + a.ph) * (a.found ? 0.04 : 0.014);
    const drawSz = s * 1.42;
    const oy = -drawSz * 0.54;
    return { s, bounce, hop, sway, drawSz, oy };
  }

  function drawAnimal(a) {
    const { s, bounce, hop, sway, drawSz, oy } = animalPose(a);
    const sp = sprites[a.data.id];
    const tuck = a.data.tuck || 0;
    const dist = Math.hypot(beam.x - a.x, beam.y - (a.y - s * 0.1));
    const lit = clamp(1 - dist / (beam.r * 1.15), 0, 1);

    g.save();
    // Blød skygge-kontakt bag dyrets nederste del (smelter dyret ned i skovbunden/hulen)
    g.fillStyle = "rgba(6, 10, 22, 0.42)";
    g.beginPath();
    g.ellipse(a.x, a.y + drawSz * (0.36 - tuck * 0.65), drawSz * 0.36, drawSz * 0.11, 0, 0, TAU);
    g.fill();

    // Klip dyret langs den naturlige forgrundskant (sten, træhul, træstamme, græs), så det kigger FREM bagfra!
    if (tuck > 0) {
      const clipBottom = a.y + drawSz * (0.46 - tuck);
      g.beginPath();
      g.rect(a.x - drawSz, a.y - drawSz * 1.4, drawSz * 2, clipBottom - (a.y - drawSz * 1.4));
      g.clip();
    }

    g.translate(a.x, a.y - hop);
    g.scale(bounce, bounce);
    g.rotate(sway);

    // Afstem lysstyrke med natte-scenen (lidt køligere/dæmpet i måneskin, varmere når lommelygten rammer)
    const bright = 0.84 + lit * 0.14 + (celebrate ? 0.08 : 0);
    if (sp && sp.full.complete && sp.full.naturalWidth) {
      if ("filter" in g) g.filter = `brightness(${bright.toFixed(2)}) saturate(0.92)`;
      g.drawImage(sp.full, -drawSz / 2, oy, drawSz, drawSz);
      if ("filter" in g) g.filter = "none";
    }
    g.restore();

    // Re-stempl en blød strimmel af 4K-baggrunden (sten/bark/græs) henover dyrets nederste kant, så integrationen er 100% sømløs
    const bgIm = bgImgs[curScene.id];
    if (tuck > 0 && bgIm && bgIm.complete && bgIm.naturalWidth) {
      const b = bgBox();
      const rimY = a.y + drawSz * (0.44 - tuck);
      const bandH = drawSz * (tuck + 0.12);
      const rx = a.x - drawSz * 0.56, rw = drawSz * 1.12;
      g.save();
      g.beginPath();
      g.ellipse(a.x, rimY + bandH * 0.42, rw * 0.52, bandH * 0.55, 0, 0, TAU);
      g.clip();
      g.globalAlpha = 0.88;
      g.drawImage(bgIm, b.ox, b.oy, b.bw, b.bh);
      g.restore();
    }
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

    // Hemmelige lyskilder (hytte-lanterne, lysende svampe, dam-spejling) lyser svagt i mørket
    secrets.forEach(m => {
      const mp = toScreen(m.nx, m.ny);
      punch(mp.x, mp.y, 26 + m.glow * 56, 0.28 + m.glow * 0.56);
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

  /* ---------- Blinkende gule øjne i mørket (dyrets egne øjne, tegnet OVER mørket) ---------- */
  function drawHiddenEyes() {
    animals.forEach(a => {
      if (a.found) return;
      const dist = Math.hypot(beam.x - a.x, beam.y - (a.y - a.sz * 0.15));
      const near = clamp(1 - dist / (beam.r * 1.25), 0, 1);

      // Blid gylden glød når dyret er ved at blive opdaget eller kaldt på
      if (a.charge > 0.02 || a.hintGlow > 0) {
        const ringR = a.sz * (0.55 + a.charge * 0.35 + (a.hintGlow > 0 ? Math.sin(time * 6) * 0.08 : 0));
        const alpha = Math.max(a.charge * 0.75, clamp(a.hintGlow / 2.5, 0, 0.65));
        g.strokeStyle = `rgba(255,235,140,${alpha})`;
        g.lineWidth = 3;
        g.beginPath(); g.arc(a.x, a.y - a.sz * 0.1, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * (a.charge > 0.02 ? a.charge : 1)); g.stroke();
      }

      // Fader blidt væk når lommelygten lyser direkte på dyret, så de rigtige øjne under mørket tager sømløst over
      const fade = 1 - smooth(clamp((near - 0.32) / 0.42, 0, 1));
      if (fade <= 0.02) return;

      const sp = sprites[a.data.id];
      if (!sp || !sp.eyes.complete || !sp.eyes.naturalWidth) return;

      const { bounce, hop, sway, drawSz, oy } = animalPose(a);
      const ey = oy + a.data.eyeY * drawSz;
      const blinkScale = a.blinkDur > 0 ? 0.12 : 1;

      g.save();
      g.globalAlpha = fade * (a.hintGlow > 0 ? 1 : 0.92);
      g.translate(a.x, a.y - hop);
      g.scale(bounce, bounce);
      g.rotate(sway);
      if (blinkScale < 1) {
        g.translate(0, ey);
        g.scale(1, blinkScale);
        g.translate(0, -ey);
      }
      g.shadowColor = "rgba(255, 224, 110, 0.72)";
      g.shadowBlur = a.hintGlow > 0 ? 16 : 8;
      g.drawImage(sp.eyes, -drawSz / 2, oy, drawSz, drawSz);
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
    drawSceneBg();
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
        "lommelygt-scene-skov", "lommelygt-scene-bondegaard", "lommelygt-scene-jungle",
        "lommelygt-fakta-maane",
      ]);
      alive = true; timers = []; saidFacts = new Set(); lastFactT = -99;
      r.innerHTML = `<div class="ll">
        <canvas aria-label="Nattescene med lommelygte"></canvas>
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
        <div class="ll-scenes" role="group" aria-label="Vælg natte-scene">
          ${SCENE_LIST.map(s => `<button data-sc="${s.id}" aria-label="${s.navn}">${s.ikon}</button>`).join("")}
        </div>
        <button class="ll-hint" aria-label="Hvem gemmer sig i mørket?">✨</button>
        <button class="ll-again" aria-label="En ny nat">🌙</button>
      </div>`;

      root = r.querySelector(".ll");
      cv = root.querySelector("canvas");
      jarEl = root.querySelector(".ll-jar");
      dotsEl = root.querySelector(".ll-dots");
      scenesEl = root.querySelector(".ll-scenes");
      hintBtn = root.querySelector(".ll-hint");
      againBtn = root.querySelector(".ll-again");
      g = cv.getContext("2d");
      darkCv = document.createElement("canvas");
      dg = darkCv.getContext("2d");

      time = 0; last = performance.now();
      holding = false; pointerId = null; pointerActive = false; idleAfter = 0;
      lastRustleT = -9; nightsDone = loadNights();
      const dyb = Spil.dyb || "";
      revealAll = dyb === "lys" || dyb.endsWith("-lys");
      const startSc = dyb.startsWith("bondegaard") ? "bondegaard" : dyb.startsWith("jungle") ? "jungle" : "skov";

      beam = { x: innerWidth * 0.5, y: innerHeight * 0.6, tx: innerWidth * 0.5, ty: innerHeight * 0.6, r: 150 };
      resize();
      switchScene(startSc, false);

      addEventListener("resize", resize);
      cv.addEventListener("pointerdown", down);
      cv.addEventListener("pointermove", move);
      cv.addEventListener("pointerup", up);
      cv.addEventListener("pointercancel", up);
      hintBtn.onclick = triggerHint;
      againBtn.onclick = () => startRound(false);
      scenesEl.querySelectorAll("button").forEach(b => {
        b.onclick = () => { if (b.dataset.sc !== curScene.id) switchScene(b.dataset.sc, true); };
      });

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
