// Spil: Raketten — tryk på den røde knap, tæl ned og flyv ud i rummet.
// Hver tur har en mission (stjerner, farvede stjerner, astronauter). Meteorer og turboringe undervejs.
// Raketten lander på en ny planet, hvor man sætter et flag (huskes) og møder et rumvæsen. Ingen tabe-tilstand.
(function () {
  const PLANETS = [
    { k: "maanen", navn: "Månen", top: "#e6e6f0", bund: "#9d9db3", prik: "#bdbdcf" },
    { k: "mars", navn: "Mars", top: "#ff9a6b", bund: "#b93e28", prik: "#de6440" },
    { k: "jupiter", navn: "Jupiter", top: "#f6dcb0", bund: "#c08552", stribe: "#dfae78" },
    { k: "saturn", navn: "Saturn", top: "#ffe8a3", bund: "#cf9f35", stribe: "#efc566" },
  ];
  const TAL = ["Én!", "To!", "Tre!", "Fire!", "Fem!", "Seks!", "Syv!", "Otte!", "Ni!", "Ti!"];
  const FARVER = [
    { k: "roed", col: "#ff5c5c", navn: "røde" }, { k: "blaa", col: "#4d96ff", navn: "blå" },
    { k: "groen", col: "#5cc46b", navn: "grønne" }, { k: "gul", col: "#ffd23f", navn: "gule" },
  ];
  const MISSIONS = ["stjerner", "farve", "astronaut"];
  const FLAGCOL = ["#ff4d5e", "#4d96ff", "#ffd23f", "#5cc46b", "#b57dff", "#ff9f43"];
  const CRATERS = [[.12, .3, .05], [.33, .62, .035], [.7, .25, .06], [.88, .65, .04], [.56, .82, .045], [.22, .85, .03]];
  const DECOR = ["🪐", "☄️", "🛸", "🌙", "🛰️"];
  // Tegnet rumvæsen (grønt, med antenner, krop og en arm der vinker) i stedet for 👽-hovedet
  const ALIEN = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g stroke="#2f7d2c" stroke-width="3" stroke-linecap="round">
      <path d="M41 20 Q36 10 31 6M59 20 Q64 10 69 6" fill="none"/>
      <circle cx="31" cy="6" r="5" fill="#ffd23f"/><circle cx="69" cy="6" r="5" fill="#ffd23f"/>
      <ellipse cx="42" cy="93" rx="8" ry="4.5" fill="#4fae46"/><ellipse cx="58" cy="93" rx="8" ry="4.5" fill="#4fae46"/>
      <path d="M66 63 Q76 70 79 77" fill="none" stroke-width="8"/><path d="M66 63 Q76 70 79 77" fill="none" stroke="#7ed957" stroke-width="3"/>
      <g class="rk-arm"><path d="M34 63 Q22 58 17 46" fill="none" stroke-width="8"/><path d="M34 63 Q22 58 17 46" fill="none" stroke="#7ed957" stroke-width="3"/>
        <circle cx="16" cy="44" r="5" fill="#7ed957"/></g>
      <circle cx="80" cy="78" r="5" fill="#7ed957"/>
      <path d="M35 56 Q50 51 65 56 L68 84 Q50 92 32 84 Z" fill="#7ed957"/>
      <ellipse cx="50" cy="36" rx="27" ry="22" fill="#7ed957"/>
    </g>
    <ellipse cx="50" cy="72" rx="10" ry="11" fill="#b7f09a"/>
    <ellipse cx="40" cy="34" rx="8" ry="10" fill="#fff"/><ellipse cx="60" cy="34" rx="8" ry="10" fill="#fff"/>
    <circle cx="41.5" cy="36" r="5" fill="#1f2a44"/><circle cx="61.5" cy="36" r="5" fill="#1f2a44"/>
    <circle cx="43" cy="34" r="1.8" fill="#fff"/><circle cx="63" cy="34" r="1.8" fill="#fff"/>
    <circle cx="30" cy="45" r="3.5" fill="#ff9bb0" opacity=".8"/><circle cx="70" cy="45" r="3.5" fill="#ff9bb0" opacity=".8"/>
    <path d="M43 47 Q50 53 57 47" fill="none" stroke="#1f2a44" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  Spil.css("css-raketten", `
    .rk{position:relative;height:100%;overflow:hidden;background:#0b1030}
    .rk canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
    /* på en smal telefon rykkes tælleren til højre, så den ikke ligger oven i hjem-knappen */
    @media (max-width:560px){.rk-count{left:auto;right:calc(12px + env(safe-area-inset-right,0px));transform:none}}
    .rk-big{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-weight:800;font-size:clamp(90px,24vh,240px);
      color:#fff;text-shadow:0 6px 0 rgba(0,0,0,.3);pointer-events:none;z-index:3;white-space:nowrap}
    .rk-big.name{font-size:clamp(30px,min(10vh,9.5vw),100px)} /* "grønne stjerner" skal være der på en smal telefon */
    .rk-big.pulse{animation:rk-pulse .5s ease-out}
    @keyframes rk-pulse{from{transform:translate(-50%,-50%) scale(1.7);opacity:0}}
    .rk-go{position:absolute;right:max(8vw,16px);bottom:calc(6vh + env(safe-area-inset-bottom,0px));width:clamp(90px,min(18vh,26vw),170px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle at 35% 30%,#ff9a9a 0 14%,#ff2d3d 45%,#c40f1e 100%);box-shadow:0 10px 0 #840a14;z-index:4}
    .rk-go::before{content:"";position:absolute;inset:-14px;border-radius:50%;border:6px solid rgba(255,255,255,.7);animation:rk-ring 1.3s ease-out infinite}
    .rk-go:active{transform:translateY(7px);box-shadow:0 3px 0 #840a14}
    @keyframes rk-ring{from{transform:scale(.9);opacity:1}to{transform:scale(1.35);opacity:0}}
    .rk-alien{position:absolute;z-index:3;background:none;font-size:clamp(64px,12vh,120px);line-height:1;padding:0;transform-origin:50% 100%;
      animation:rk-in .5s cubic-bezier(.3,1.6,.5,1) both,rk-bob 1.6s ease-in-out .5s infinite}
    .rk-alien.hej{animation:rk-hop .6s}
    .rk-alien svg{display:block;width:1em;height:1em;overflow:visible}
    .rk-arm{transform-origin:34px 62px;animation:rk-vink 1.2s ease-in-out infinite}
    @keyframes rk-vink{50%{transform:rotate(-22deg)}}
    @keyframes rk-in{from{transform:scale(0)}}
    @keyframes rk-bob{50%{transform:translateY(-8px) rotate(4deg)}}
    @keyframes rk-hop{30%{transform:translateY(-40px) scale(1.15) rotate(-8deg)}}
    .rk-count{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:3;
      background:rgba(255,255,255,.92);border-radius:999px;padding:.15em .8em;font-weight:800;font-size:clamp(26px,5vh,48px);
      font-variant-numeric:tabular-nums;pointer-events:none;box-shadow:0 5px 0 rgba(0,0,0,.25);white-space:nowrap}
    @media (prefers-reduced-motion:reduce){.rk-go::before,.rk-alien,.rk-big.pulse,.rk-arm{animation:none}}
  `);

  let root, cv, c, W, H, raf, last, alive, timers, phase, loc, count, goal, mission, color, trip, rocket, cam, sky,
    items, parts, decor, meteors, rings, spawnT, decorT, meteorT, ringT, turbo, hovT, shake, landT, rumbleSrc, finishing, flags, clock, dybTest;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t))})`; };
  const RH = () => Math.max(Math.min(W, H) * 0.26, Math.min(H * 0.16, W * 0.36)); // rakettens højde (lidt større på højkant)
  const groundY = () => H * 0.84;
  const rest = () => groundY() - RH() * 0.47;      // raketten står på jorden
  const loadFlags = () => { try { return JSON.parse(localStorage.getItem("lk-flag")) || {}; } catch (e) { return {}; } };
  const saveFlags = () => { if (dybTest) return; try { localStorage.setItem("lk-flag", JSON.stringify(flags)); } catch (e) {} };

  /* ---------- Lyd ---------- */
  function rumble(sec) {
    try {
      const a = Spil.audio(), n = a.sampleRate * sec, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      let v = 0;
      for (let i = 0; i < n; i++) { v = (v + (Math.random() * 2 - 1) * .1) / 1.02; d[i] = v * 3; } // brun støj
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
      f.type = "lowpass"; f.frequency.value = 500;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.7, t + .4);
      g.gain.setValueAtTime(.7, t + sec * .5); g.gain.exponentialRampToValueAtTime(.0001, t + sec);
      s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(); rumbleSrc = s;
    } catch (e) {}
  }
  function sweep() {
    try {
      const a = Spil.audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1600, t + .5);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .6);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + .65);
    } catch (e) {}
  }

  /* ---------- Tegning ---------- */
  function drawRocket(x, y, h, flame, tilt) {
    const w = h * .36;
    c.save(); c.translate(x, y); c.rotate(tilt);
    if (flame > 0) {
      const fl = h * (.25 + .45 * flame) * (.85 + Math.random() * .3);
      c.fillStyle = turbo > 0 ? "#7cc6f2" : "#ff7a2e";
      c.beginPath(); c.moveTo(-w * .3, h * .44); c.quadraticCurveTo(-w * .2, h * .44 + fl * .7, 0, h * .44 + fl);
      c.quadraticCurveTo(w * .2, h * .44 + fl * .7, w * .3, h * .44); c.fill();
      c.fillStyle = turbo > 0 ? "#ffffff" : "#ffe066";
      c.beginPath(); c.moveTo(-w * .16, h * .44); c.quadraticCurveTo(0, h * .44 + fl * .8, w * .16, h * .44); c.fill();
    }
    c.fillStyle = "#ff4d5e";
    [-1, 1].forEach(s => { c.beginPath(); c.moveTo(s * w * .42, h * .02); c.lineTo(s * w * .98, h * .42); c.lineTo(s * w * .42, h * .34); c.fill(); });
    const body = new Path2D();
    body.moveTo(0, -h * .5);
    body.bezierCurveTo(w * .75, -h * .28, w * .55, h * .22, w * .4, h * .4);
    body.lineTo(-w * .4, h * .4);
    body.bezierCurveTo(-w * .55, h * .22, -w * .75, -h * .28, 0, -h * .5);
    c.fillStyle = "#f4f6ff"; c.fill(body);
    c.save(); c.clip(body);
    c.fillStyle = "#ff4d5e"; c.fillRect(-w, -h * .5, w * 2, h * .2);
    c.fillStyle = "rgba(31,58,95,.12)"; c.fillRect(w * .12, -h * .5, w, h);
    c.fillStyle = "#ff4d5e"; c.fillRect(-w, h * .24, w * 2, h * .05);
    c.restore();
    c.beginPath(); c.arc(0, -h * .08, w * .22, 0, Math.PI * 2);
    c.fillStyle = "#7cc6f2"; c.fill(); c.lineWidth = w * .08; c.strokeStyle = "#3a4a7a"; c.stroke();
    c.beginPath(); c.arc(-w * .07, -h * .11, w * .07, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.8)"; c.fill();
    c.fillStyle = "#5a6380"; c.fillRect(-w * .25, h * .4, w * .5, h * .06);
    c.restore();
  }

  function starPath(x, y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  function emoji(e, x, y, s, alpha = 1, rot = 0) {
    c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(rot);
    c.font = `${s}px serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(e, 0, 0); c.restore();
  }

  // Jordens kurve: y-værdi ved x (samme kurve som tegnes i drawGround)
  function groundAt(x, gy) {
    const t = clamp((x + 10) / (W + 20), 0, 1), a = gy + H * .03, m = gy - H * .04;
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * m + t * t * a;
  }

  function cloud(x, y, s) {
    c.fillStyle = "#fff"; c.beginPath(); // én samlet form, så de runde dele ikke ses igennem hinanden, når skyen fader
    [[0, 0, .5], [-.45, .12, .34], [.45, .1, .38], [.2, -.22, .36], [-.2, -.15, .3]].forEach(([a, b, r]) => {
      c.moveTo(x + (a + r) * s, y + b * s); c.arc(x + a * s, y + b * s, r * s, 0, Math.PI * 2);
    });
    c.fill();
    c.fillStyle = "rgba(190,215,235,.5)"; c.beginPath(); c.ellipse(x, y + s * .3, s * .75, s * .12, 0, 0, Math.PI * 2); c.fill();
  }

  // Himlen over startrampen: sol, skyer og bakker i det fjerne. Skyerne ligger i flere højder, så raketten flyver forbi dem.
  function drawEarthSky(gy) {
    const m = Math.min(W, H), sx = W * .84, sy = H * .18 + cam * .05; // solen er langt væk og flytter sig næsten ikke
    c.globalAlpha = 1 - clamp(cam / (H * 1.2), 0, 1); // ude i rummet er sol og skyer væk
    if (sy > -m * .2 && sy < H + m * .2) {
      const sg = c.createRadialGradient(sx, sy, m * .05, sx, sy, m * .12);
      sg.addColorStop(0, "rgba(255,245,200,.8)"); sg.addColorStop(1, "rgba(255,245,200,0)");
      c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, m * .12, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(sx, sy, m * .065, 0, Math.PI * 2); c.fill();
    }
    [[.18, .62, .09], [.6, .5, .07], [.82, .32, .06], [.3, .95, .1], [.75, 1.15, .08]].forEach(([x, y, k]) => {
      const cy = gy - H * y;
      if (cy > -m * .2 && cy < H + m * .2) cloud(W * x, cy, m * k * 1.6);
    });
    c.globalAlpha = 1;
    if (gy > H + 10) return;
    c.fillStyle = "#a6dc95"; // bakker langt væk
    c.beginPath(); c.moveTo(-10, gy + H * .05);
    c.quadraticCurveTo(W * .15, gy - H * .1, W * .35, gy - H * .01);
    c.quadraticCurveTo(W * .62, gy - H * .12, W * .8, gy - H * .02);
    c.quadraticCurveTo(W * .92, gy - H * .07, W + 10, gy - H * .02);
    c.lineTo(W + 10, gy + H * .05); c.fill();
  }

  function drawFlag(x, gy, col, i) {
    const h = RH(), by = groundAt(x, gy), top = by - h * .62, wave = Math.sin(clock * 4 + i) * h * .03;
    c.strokeStyle = "#e8e8f0"; c.lineWidth = Math.max(3, h * .03); c.lineCap = "round";
    c.beginPath(); c.moveTo(x, by + 2); c.lineTo(x, top); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x, top); c.quadraticCurveTo(x + h * .18, top + h * .05 + wave, x + h * .34, top + h * .1);
    c.quadraticCurveTo(x + h * .18, top + h * .17 - wave, x, top + h * .22); c.fill();
    c.fillStyle = "#fff"; starPath(x + h * .13, top + h * .1, h * .045, 0); c.fill();
  }

  // En lille, rund måne med skygge (bruges på Mars og Jupiter)
  function drawMoonlet(x, y, r, col, dark) {
    const g = c.createRadialGradient(x - r * .4, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, dark);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(0,0,0,.15)";
    [[.3, -.2, .22], [-.3, .3, .18]].forEach(([a, b, k]) => { c.beginPath(); c.arc(x + a * r, y + b * r, k * r, 0, Math.PI * 2); c.fill(); });
  }

  // Jorden set fra Månen: hav, grønne lande, hvide skyer og skygge på den ene side
  function drawEarth(x, y, r) {
    c.save();
    c.shadowColor = "rgba(124,198,242,.7)"; c.shadowBlur = r * .5;
    c.fillStyle = "#2f7fe0"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0; c.clip();
    c.fillStyle = "#5cc46b";
    [[-.35, -.35, .45, .3, .4], [.3, .1, .35, .5, -.3], [-.4, .45, .3, .2, .2], [.45, -.55, .2, .15, 0]].forEach(([a, b, rx, ry, rot]) => {
      c.beginPath(); c.ellipse(x + a * r, y + b * r, rx * r, ry * r, rot, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = "rgba(255,255,255,.55)"; // bløde skyer
    [[-.05, -.02, .32, .09, -.2], [.15, .58, .3, .08, .1], [-.6, .05, .2, .07, .3]].forEach(([a, b, rx, ry, rot]) => {
      c.beginPath(); c.ellipse(x + a * r, y + b * r, rx * r, ry * r, rot, 0, Math.PI * 2); c.fill();
    });
    const sh = c.createRadialGradient(x - r * .35, y - r * .35, r * .2, x, y, r * 1.05);
    sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(.6, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(5,10,40,.45)");
    c.fillStyle = sh; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  // Himlen over planeten: hver planet har sit eget kendetegn
  function drawPlanetSky(p, dy) {
    const m = Math.min(W, H), gy = groundY() + cam;
    if (p.k === "maanen") { drawEarth(W * .8, H * .17 + dy, m * .085); return; }
    // varmt skær over horisonten
    const glow = { mars: "255,120,80", jupiter: "240,170,110", saturn: "255,215,130" }[p.k];
    const g = c.createLinearGradient(0, gy - H * .35, 0, gy);
    g.addColorStop(0, `rgba(${glow},0)`); g.addColorStop(1, `rgba(${glow},.4)`);
    c.fillStyle = g; c.fillRect(0, gy - H * .35, W, H * .4); // lidt ned under jorden, så der ikke er en kant ved siderne
    if (p.k === "mars") { // Mars' to små måner
      drawMoonlet(W * .8, H * .15 + dy, m * .035, "#c9b6a6", "#7d6a5c");
      drawMoonlet(W * .62, H * .27 + dy, m * .02, "#d8c8bb", "#8d7a6c");
    } else if (p.k === "jupiter") { // Io og Europa
      drawMoonlet(W * .8, H * .15 + dy, m * .04, "#fff08a", "#d8a03a");
      drawMoonlet(W * .64, H * .26 + dy, m * .028, "#ffffff", "#b9b2a6");
    } else { // Saturns ringe som en stor bue hen over himlen
      c.save(); c.translate(W / 2, gy + H * .08); c.rotate(-.12);
      const rx = Math.max(W * .62, H * .45), ry = H * .62;
      [["#fff3cf", .05, .85], ["#e9c27c", .035, .8], ["#ffe3a3", .025, .85]].forEach(([col, w, a], i) => {
        c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = m * w;
        const k = 1 - i * .07;
        c.beginPath(); c.ellipse(0, 0, rx * k, ry * k, 0, Math.PI, Math.PI * 2); c.stroke();
      });
      c.restore(); c.globalAlpha = 1;
    }
  }

  function drawGround(gy) {
    if (loc < 0) drawEarthSky(gy);
    if (gy > H + 10) return;
    const p = loc >= 0 ? PLANETS[loc] : null, m = Math.min(W, H), bottom = gy + H;
    const top = new Path2D();
    top.moveTo(-10, gy + H * .03); top.quadraticCurveTo(W / 2, gy - H * .04, W + 10, gy + H * .03);
    top.lineTo(W + 10, bottom); top.lineTo(-10, bottom); top.closePath();
    if (!p) {
      const gg = c.createLinearGradient(0, gy - H * .04, 0, gy + H * .2);
      gg.addColorStop(0, "#74cc6f"); gg.addColorStop(1, "#4e9f50");
      c.fillStyle = gg; c.fill(top);
      const h = RH(), tx = W / 2 - h * .62, tw = h * .2, th = h * 1.05, n = Math.round(th / tw), cell = th / n;
      c.strokeStyle = "#8d95ad"; c.lineWidth = Math.max(2, h * .025); c.lineJoin = "round";
      c.strokeRect(tx - tw / 2, gy - th, tw, th);
      c.beginPath(); // gitteret går præcis op til toppen af tårnet
      for (let i = 0; i < n; i++) {
        const y0 = gy - i * cell, y1 = y0 - cell;
        c.moveTo(tx - tw / 2, y0); c.lineTo(tx + tw / 2, y1); c.moveTo(tx + tw / 2, y0); c.lineTo(tx - tw / 2, y1);
      }
      c.moveTo(tx + tw / 2, gy - th * .7); c.lineTo(W / 2 - h * .14, gy - th * .7);
      c.stroke();
      c.fillStyle = "#5a6380"; c.fillRect(tx - tw * .7, gy - th - h * .04, tw * 1.4, h * .04); // platform på toppen
      c.fillStyle = Math.sin(clock * 4) > 0 || still ? "#ff4d5e" : "#a8323d"; // blinkende lampe
      c.beginPath(); c.arc(tx, gy - th - h * .07, h * .03, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#5a6380"; c.fillRect(W / 2 - h * .45, gy - h * .02, h * .9, h * .06);
      return;
    }
    const g = c.createLinearGradient(0, gy - H * .04, 0, gy + H * .2);
    g.addColorStop(0, p.top); g.addColorStop(1, p.bund);
    c.fillStyle = g; c.fill(top);
    c.save(); c.clip(top);
    if (p.stribe) {
      // striberne følger planetens krumning, skiftevis brede og smalle
      c.strokeStyle = p.stribe;
      [[.045, .022], [.095, .012], [.14, .03], [.2, .016]].forEach(([o, w]) => {
        c.lineWidth = H * w; c.beginPath();
        c.moveTo(-10, gy + H * (.03 + o)); c.quadraticCurveTo(W / 2, gy + H * (o - .04), W + 10, gy + H * (.03 + o)); c.stroke();
      });
      if (p.k === "jupiter") { // den store røde plet
        const x = W * .74, y = groundAt(x, gy) + H * .09;
        c.fillStyle = "#c8583a"; c.beginPath(); c.ellipse(x, y, m * .1, m * .035, -.05, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#e07a52"; c.beginPath(); c.ellipse(x - m * .01, y - m * .005, m * .065, m * .02, -.05, 0, Math.PI * 2); c.fill();
      }
    } else {
      // kratere med lys kant forneden og skygge foroven, så de ligner huller
      CRATERS.forEach(([x, y, r]) => {
        const cx = x * W, cy = gy + H * .02 + y * H * .14, rx = r * m * 1.4, ry = r * m * .5;
        c.fillStyle = p.prik; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(cx, cy - ry * .25, rx * .85, ry * .65, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = Math.max(2, ry * .3); c.lineCap = "round";
        c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI * .1, Math.PI * .9); c.stroke();
      });
      if (p.k === "mars") { // små sten på den røde jord
        [[.06, .2, .022], [.45, .35, .016], [.8, .12, .02], [.63, .55, .014]].forEach(([x, y, r]) => {
          const cx = x * W, cy = groundAt(cx, gy) + H * .02 + y * H * .14, rr = r * m;
          c.fillStyle = "#9c3a26"; c.beginPath(); c.ellipse(cx, cy, rr * 1.3, rr, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = "#e27a55"; c.beginPath(); c.ellipse(cx - rr * .35, cy - rr * .35, rr * .5, rr * .3, 0, 0, Math.PI * 2); c.fill();
        });
      }
    }
    c.restore();
    (flags[p.k] || []).forEach((f, i) => drawFlag(f.x * W, gy, f.c, i));
    if (phase === "flag") emoji("👆", W * .3, gy + H * .06 + Math.sin(clock * 6) * 8, Math.min(W, H) * .1);
  }

  function drawMeteor(m) {
    c.save(); c.translate(m.x, m.y); c.rotate(m.rot);
    c.fillStyle = "#8a6a55"; c.strokeStyle = "#5b4334"; c.lineWidth = m.r * .12;
    c.beginPath();
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = m.r * (.85 + .15 * Math.sin(i * 2.7)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#6e5242";
    [[-.3, -.2, .22], [.3, .25, .18], [.1, -.4, .12]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * m.r, y * m.r, r * m.r, 0, Math.PI * 2); c.fill(); });
    c.restore();
  }

  // Ringen tegnes i to halvdele: den bageste bue bag raketten og den forreste foran, så raketten flyver igennem den
  function drawRing(r, front) {
    const cols = ["#ff5c5c", "#ff9f43", "#ffd23f", "#5cc46b", "#4d96ff", "#b57dff"];
    c.lineWidth = r.rx * .07; c.lineCap = "butt";
    const a0 = front ? 0 : Math.PI - .05, a1 = front ? Math.PI : Math.PI * 2 + .05; // lidt overlap, så der ikke er en streg i samlingen
    // først når ringen er forbi raketten, bliver den svag
    const alpha = r.passed ? clamp(1 - (r.y - rocket.y) / RH(), .35, 1) : 1;
    cols.forEach((col, i) => {
      c.strokeStyle = col; c.globalAlpha = alpha;
      c.beginPath(); c.ellipse(r.x, r.y, r.rx - i * c.lineWidth, (r.rx - i * c.lineWidth) * .32, 0, a0, a1); c.stroke();
    });
    c.globalAlpha = 1;
  }

  function draw() {
    c.save();
    if (shake > 0) c.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    const space = loc >= 0 ? 1 : clamp(cam / (H * 1.2), 0, 1);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix("#5fb8ef", "#070b24", space)); g.addColorStop(1, mix("#cfeefc", "#22205a", space));
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    c.fillStyle = "#fff";
    const streak = turbo > 0 ? 12 : 1;
    // stjernerne blinker svagt
    sky.forEach(s => { c.globalAlpha = space * (.35 + .65 * s.z) * (still ? 1 : .75 + .25 * Math.sin(clock * 2.5 + s.x * 40)); const r = s.z * 2.2; c.fillRect(s.x * W, s.y * H, r, r * streak); });
    c.globalAlpha = 1;
    if (loc >= 0) drawPlanetSky(PLANETS[loc], cam * .3);
    decor.forEach(d => emoji(d.e, d.x, d.y, d.s, .55));
    drawGround(groundY() + cam);
    rings.forEach(r => drawRing(r, false));
    parts.forEach(p => {
      if (p.kind !== "smoke") return;
      c.globalAlpha = clamp(p.life / p.max, 0, 1) * .85; c.fillStyle = "#eef0f8";
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    });
    c.globalAlpha = 1;
    items.forEach(it => {
      if (it.kind === "astro") { emoji("🧑‍🚀", it.x, it.y, it.r * 2.4, 1, Math.sin(it.rot) * .5); return; }
      c.shadowColor = it.col; c.shadowBlur = 18; c.fillStyle = it.col;
      starPath(it.x, it.y, it.r, it.rot); c.fill();
    });
    c.shadowBlur = 0;
    meteors.forEach(drawMeteor);
    drawRocket(rocket.x, rocket.y, RH(), rocket.flame, rocket.tilt + Math.sin(clock * 28) * rocket.wob * .35);
    rings.forEach(r => drawRing(r, true));
    parts.forEach(p => {
      if (p.kind === "smoke") return;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.col;
      if (p.kind === "rock") { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
      else { starPath(p.x, p.y, p.r, p.life * 6); c.fill(); }
    });
    c.globalAlpha = 1;
    c.restore();
  }

  /* ---------- Opdatering ---------- */
  function puff(n, strong) {
    const h = RH();
    for (let i = 0; i < n; i++) parts.push({
      kind: "smoke", x: rocket.x + (Math.random() - .5) * h * .2, y: rocket.y + h * .5,
      vx: (Math.random() - .5) * (strong ? W * .5 : W * .12), vy: (strong ? .2 : -.05) * H * Math.random(),
      r: h * (.08 + Math.random() * .08), grow: h * (strong ? .5 : .2), life: 1.4, max: 1.4,
    });
  }
  function sparks(x, y, cols = ["#ffd23f", "#fff3b0", "#ff9f43", "#7cc6f2"], kind = "spark", n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (.15 + Math.random() * .25) * Math.min(W, H);
      parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 6 + Math.random() * 8, grow: 0, life: .8, max: .8, col: cols[i % cols.length] });
    }
  }

  function update(dt) {
    const h = RH(); let scroll = 0;
    clock += dt;
    rocket.wob = Math.max(0, rocket.wob - dt * 1.2);
    if (phase === "launch") {
      rocket.vy += H * 1.2 * dt;
      const dy = rocket.vy * dt;
      if (rocket.y > H * .66) rocket.y -= dy; else { cam += dy; scroll = dy; }
      puff(3, cam < H * .4);
      shake = still ? 0 : Math.max(0, shake - dt * 2.5);
      if (cam > H * 1.5) startFly();
    } else if (phase === "fly") {
      turbo = Math.max(0, turbo - dt);
      scroll = H * .35 * dt * (turbo > 0 ? 3 : 1);
      rocket.flame = turbo > 0 ? 1 : .7;
      rocket.x += (rocket.tx - rocket.x) * Math.min(1, dt * 7);
      rocket.tilt = clamp((rocket.tx - rocket.x) / W * 2, -.35, .35);
      shake = Math.max(0, shake - dt * 10);
      updateItems(dt, h); updateHazards(dt, h);
    } else if (phase === "land") {
      landT = Math.min(1, landT + dt / 3.2);
      const e = 1 - Math.pow(1 - landT, 3), prev = cam;
      cam = H * 1.5 * (1 - e); scroll = cam - prev;
      rocket.x += (W / 2 - rocket.x) * Math.min(1, dt * 3);
      rocket.tilt *= .9;
      rocket.y = H * .66 + (rest() - H * .66) * e;
      rocket.flame = .25 + .3 * (1 - e);
      if (landT > .7) puff(1, false);
      if (landT >= 1) arrive();
    }
    if (phase === "fly") {
      decorT -= dt;
      if (decorT <= 0) {
        decorT = 3 + Math.random() * 3;
        decor.push({ e: DECOR[Math.random() * DECOR.length | 0], x: W * (.1 + Math.random() * .8), y: -80, s: Math.min(W, H) * (.08 + Math.random() * .08) });
      }
    }
    sky.forEach(s => { s.y += scroll * s.z / H * .9; if (s.y > 1) { s.y -= 1; s.x = Math.random(); } if (s.y < 0) s.y += 1; });
    decor.forEach(d => { d.y += scroll * (phase === "land" ? 1.5 : .5) + (phase === "fly" ? H * .03 * dt : 0); });
    decor = decor.filter(d => d.y < H + 120 && d.y > -200);
    parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt + (p.kind === "smoke" ? scroll : 0); p.r += p.grow * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
  }

  function updateItems(dt, h) {
    const speed = H * .26 * (turbo > 0 ? 1.6 : 1);
    if (!finishing) {
      spawnT -= dt;
      const targets = items.filter(isTarget).length;
      if (spawnT <= 0 && count + targets < goal + 2) {
        const astro = mission === "astronaut";
        spawnT = astro ? 1.5 + Math.random() * .6 : .9 + Math.random() * .5;
        const near = Math.random() < .45; // nogle kommer lige mod raketten
        const x = near ? clamp(rocket.x + (Math.random() - .5) * W * .15, W * .1, W * .9) : W * (.1 + Math.random() * .8);
        const it = { kind: astro ? "astro" : "star", x, y: -50, r: Math.min(W, H) * .055, rot: 0, col: "#ffd23f", k: null };
        if (mission === "farve") {
          const f = Math.random() < .45 ? color : FARVER[Math.random() * FARVER.length | 0];
          it.col = f.col; it.k = f.k;
        }
        items.push(it);
      }
    }
    items.forEach(it => {
      it.y += speed * dt; it.rot += dt * 1.5;
      const dx = rocket.x - it.x, dy = rocket.y - it.y;
      if (isTarget(it) && Math.abs(dx) < h * .9 && Math.abs(dy) < h * .9) { it.x += dx * dt * 5; it.y += dy * dt * 3; } // lidt magnet
      if (Math.hypot(dx, dy) < h * .45) { it.got = true; collect(it); }
    });
    items = items.filter(it => !it.got && it.y < H + 60);
  }
  const isTarget = it => mission !== "farve" || it.k === color.k;

  function updateHazards(dt, h) {
    if (finishing) return;
    // meteorer fra anden tur
    if (trip > 0) {
      meteorT -= dt;
      if (meteorT <= 0) {
        meteorT = 2.8 + Math.random() * 2;
        meteors.push({ x: W * (.1 + Math.random() * .8), y: -60, r: Math.min(W, H) * (.045 + Math.random() * .03), vx: (Math.random() - .5) * W * .08, vy: H * (.32 + Math.random() * .12), rot: 0, vr: (Math.random() - .5) * 3 });
      }
    }
    meteors.forEach(m => {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt;
      if (!m.hit && Math.hypot(rocket.x - m.x, rocket.y - m.y) < m.r + h * .3) {
        m.hit = true; rocket.wob = 1; shake = still ? 0 : 6;
        sparks(m.x, m.y, ["#8a6a55", "#6e5242", "#b08b70"], "rock", 10);
        Spil.tone([140, 90], .12, "triangle");
        if (clock - hovT > 5) { hovT = clock; Spil.say("Hov! En meteor!", null, "raket-hov"); }
      }
    });
    meteors = meteors.filter(m => !m.hit && m.y < H + 80);
    // regnbueringe giver turbo
    ringT -= dt;
    if (ringT <= 0) {
      ringT = 6 + Math.random() * 3;
      rings.push({ x: W * (.2 + Math.random() * .6), y: -40, rx: h * .75 });
    }
    rings.forEach(r => {
      r.y += H * .3 * dt;
      if (!r.passed && Math.abs(r.y - rocket.y) < h * .25 && Math.abs(r.x - rocket.x) < r.rx * .85) {
        r.passed = true; turbo = 2.2; sweep();
        sparks(r.x, r.y, ["#ff5c5c", "#ffd23f", "#5cc46b", "#4d96ff", "#b57dff"]);
        if (!Spil.isTalking()) Spil.say("Wiiii!", null, "raket-wii");
      }
    });
    rings = rings.filter(r => r.y < H + 80);
  }

  function counter() {
    const icon = mission === "astronaut" ? "🧑‍🚀" : mission === "farve" ? `<span style="color:${color.col}">★</span>` : "⭐";
    q(".rk-count").innerHTML = `${icon} ${count} / ${goal}`;
  }

  function collect(it) {
    if (finishing) return;
    if (!isTarget(it)) { // forkert farve: lille gnist og stemmen siger farven
      sparks(it.x, it.y, [it.col], "spark", 6);
      Spil.tone([500, 420], .06, "triangle");
      const f = FARVER.find(f => f.k === it.k);
      Spil.say(f.navn, null, `farve-${it.k}`);
      return;
    }
    count++; sparks(it.x, it.y, mission === "farve" ? [it.col, "#fff"] : undefined);
    Spil.tone([880 + count * 40, 1320 + count * 40], .07);
    counter();
    if (count >= goal) {
      finishing = true; items.forEach(i => { i.got = true; sparks(i.x, i.y); }); meteors = [];
      Spil.sfx.fanfare();
      // "Ti stjerner! Super flot!" siger selv tallet, så "Ti!" foran ville lyde dobbelt
      const [txt, keys] = {
        stjerner: ["Ti stjerner! Super flot!", ["raket-super"]],
        farve: [`${TAL[goal - 1]} Du fangede alle stjernerne! Super flot!`, [`tal-${goal}`, "raket-farve-faerdig"]],
        astronaut: [`${TAL[goal - 1]} Alle astronauterne er reddet! Super flot!`, [`tal-${goal}`, "raket-alle-reddet"]],
      }[mission];
      Spil.say(txt, () => later(startLand, 500), keys);
      later(startLand, 8000); // landingen kommer også, hvis stemmen bliver afbrudt
    } else if (mission === "astronaut" && count === 1) {
      Spil.say("Tak! Du reddede mig!", null, "raket-tak");
    } else {
      Spil.say(TAL[count - 1], null, `tal-${count}`);
    }
  }

  /* ---------- Faser ---------- */
  function big(txt, cls = "") {
    const b = q(".rk-big"); b.className = "rk-big " + cls; b.textContent = txt;
    if (txt) { void b.offsetWidth; b.classList.add("pulse"); }
  }

  function showGo(first) {
    q(".rk-go").hidden = false;
    Spil.say(first ? "Tryk på den røde knap!" : "Skal vi flyve videre? Tryk på knappen!", null, first ? "raket-tryk" : "raket-igen");
  }

  function press() {
    if (phase !== "pad" && phase !== "planet") return;
    Spil.sfx.click();
    q(".rk-go").hidden = true; q(".rk-alien").hidden = true;
    phase = "count";
    // nedtællingen starter også uden at stemmen melder færdig
    let started = false; const start = () => { if (started || phase !== "count") return; started = true; step(5); };
    Spil.say("Er du klar? Nu tæller vi ned!", () => later(start, 300), "raket-klar");
    later(start, 6000);
  }

  function step(n) {
    if (n === 0) {
      big("Affyring!", "name");
      Spil.say("Affyring!", null, "raket-affyring");
      phase = "launch"; rocket.vy = 0; rocket.flame = 1; shake = still ? 0 : 9; rumble(4.5);
      later(() => big(""), 1400);
      return;
    }
    big(String(n));
    rocket.flame = (5 - n) * .05; puff(4, false);
    let next = false; const go = () => { if (next) return; next = true; step(n - 1); };
    Spil.say(TAL[n - 1], () => later(go, 250), `tal-${n}`);
    later(go, 2500);
  }

  function startFly() {
    mission = MISSIONS[trip % MISSIONS.length];
    goal = mission === "stjerner" ? 10 : 5;
    color = FARVER[Math.random() * FARVER.length | 0];
    phase = "fly"; count = 0; finishing = false; spawnT = 1.2; items = []; meteors = []; rings = [];
    meteorT = 3; ringT = 4; turbo = 0;
    rocket.flame = .7; rocket.tx = rocket.x; shake = 0;
    q(".rk-count").hidden = false; counter();
    if (mission === "farve") { big(`${color.navn} stjerner`, "name"); later(() => big(""), 2500); }
    const intro = { stjerner: ["Fang stjernerne!", "raket-fang"], farve: [`Fang de ${color.navn} stjerner!`, `raket-farve-${color.k}`], astronaut: ["Red astronauterne!", "raket-astronaut"] }[mission];
    Spil.say(intro[0], null, intro[1]);
  }

  function startLand() {
    if (phase !== "fly") return;
    trip++;
    loc = (loc + 1) % PLANETS.length; landT = 0; phase = "land";
    q(".rk-count").hidden = true; rings = []; meteors = []; turbo = 0;
    big(PLANETS[loc].navn, "name");
  }

  function arrive() {
    phase = "flagwait"; rocket.flame = 0; rocket.tilt = 0; rocket.y = rest(); decor = [];
    const p = PLANETS[loc], r = root.getBoundingClientRect(), h = RH();
    Spil.sfx.fanfare(); Spil.burst(r.left + rocket.x, r.top + rocket.y - h * .3, "⭐✨🌟🎉⭐✨🌟🎉");
    Spil.say(`Vi er fremme ved ${p.navn}!`, () => later(askFlag, 400), `raket-fremme-${p.k}`);
    later(askFlag, 7000);
  }

  function askFlag() {
    if (phase !== "flagwait") return;
    phase = "flag"; big("");
    Spil.say("Tryk på jorden for at sætte flaget!", null, "raket-flag");
    later(() => { if (phase === "flag") Spil.say("Tryk på jorden for at sætte flaget!", null, "raket-flag"); }, 9000);
  }

  function plantFlag(x) {
    const p = PLANETS[loc], list = flags[p.k] = flags[p.k] || [];
    const col = FLAGCOL[(list.length + loc) % FLAGCOL.length];
    list.push({ x: clamp(x / W, .05, .95), c: col });
    if (list.length > 8) list.shift();
    saveFlags();
    phase = "planet";
    const r = root.getBoundingClientRect();
    Spil.burst(r.left + x, r.top + groundAt(x, groundY()) - RH() * .4);
    Spil.sfx.right();
    // rumvæsenet dukker op til venstre for raketten (knappen sidder til højre)
    const a = q(".rk-alien"), size = Math.min(120, Math.max(64, H * .12));
    a.hidden = false; a.classList.remove("hej");
    // rumvæsenet står på den side af raketten, der er længst fra det nye flag (og uden om knappen)
    const fx = x, btn = q(".rk-go").offsetLeft, sz = Math.min(size, W * .22);
    const lx = Math.max(8, rocket.x - RH() * .5 - sz), rx = rocket.x + RH() * .5;
    const rOk = rx + sz < btn - 8 || btn <= 0;
    const ax = rOk && Math.abs(rx + sz / 2 - fx) > Math.abs(lx + sz / 2 - fx) ? rx : lx;
    a.style.fontSize = sz + "px";
    a.style.left = ax + "px"; a.style.top = (groundY() - sz * 1.05) + "px";
    Spil.say("Flot! Nu er flaget sat!", readyAgain, "raket-flag-sat");
    later(() => { if (!Spil.isTalking()) readyAgain(); }, 6000);
  }

  // Knappen kommer frem, når stemmen er færdig — også hvis barnet afbryder ved at trykke på rumvæsenet
  function readyAgain() {
    later(() => { if (phase === "planet" && q(".rk-go").hidden) showGo(false); }, 1200);
  }

  function hej() {
    const a = q(".rk-alien"); a.classList.remove("hej"); void a.offsetWidth; a.classList.add("hej");
    Spil.sfx.click(); Spil.say("Hej hej! Jeg er et rumvæsen!", readyAgain, "raket-hej");
  }

  function resize() {
    if (!alive) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (["pad", "count", "planet", "flag", "flagwait"].includes(phase)) { rocket.x = W / 2; rocket.y = rest(); }
    rocket.x = clamp(rocket.x, W * .1, W * .9); rocket.tx = clamp(rocket.tx, W * .1, W * .9);
  }

  function frame(t) {
    if (!alive) return;
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  function pointer(e) {
    const x = e.clientX - root.getBoundingClientRect().left;
    if (phase === "fly") rocket.tx = clamp(x, W * .08, W * .92);
    else if (phase === "flag" && e.type === "pointerdown") plantFlag(x);
  }

  // Dybt link til test (Spil.dyb). Flag sat via et dybt link gemmes ikke.
  //   "nedtaelling"                          = nedtællingen er i gang
  //   "flyv-stjerner|flyv-farve|flyv-astronaut" = ude i rummet med den mission ("flyv-meteor" = stjerner med meteorer,
  //                                            "flyv-ring" = en regnbuering kommer med det samme); "-9" bagefter = 9 er fanget
  //   "landing-<planet>"                     = raketten lander på planeten (maanen, mars, jupiter, saturn)
  //   "planet-<planet>"                      = fremme på planeten, klar til at sætte flaget
  //   "rumvaesen-<planet>"                   = flaget er sat, og rumvæsenet står på planeten
  // Returnerer true, hvis linket blev brugt.
  function dybtLink(d) {
    let m;
    if (d === "nedtaelling") { phase = "pad"; press(); return true; }
    if ((m = d.match(/^flyv-(stjerner|farve|astronaut|meteor|ring)(?:-(\d+))?$/))) {
      trip = Math.max(0, ["stjerner", "farve", "astronaut", "meteor"].indexOf(m[1]));
      cam = H * 1.5; rocket.y = H * .66; startFly();
      if (m[1] === "ring") { ringT = 99; rings.push({ x: rocket.x, y: -40, rx: RH() * .75 }); } // en ring lige mod raketten
      if (m[2]) { count = clamp(+m[2], 0, goal - 1); counter(); }
      return true;
    }
    if ((m = d.match(/^(landing|planet|rumvaesen)-(\w+)$/))) {
      const i = PLANETS.findIndex(p => p.k === m[2]);
      if (i < 0) return false;
      dybTest = true;
      if (m[1] === "landing") { loc = i - 1; cam = H * 1.5; rocket.y = H * .66; startFly(); startLand(); return true; }
      loc = i; cam = 0; rocket.y = rest();
      if (m[1] === "planet") { arrive(); return true; }
      phase = "flag"; rocket.flame = 0; plantFlag(W * .25); return true;
    }
    return false;
  }

  Spil.register({
    id: "raketten", navn: "Raketten", ikon: "🚀", farve: "#c9b8ff",
    start(r) {
      Spil.preload(["raket-tryk", "raket-klar", "raket-affyring", "raket-fang", "raket-super", "raket-hej", "raket-igen",
        "raket-astronaut", "raket-tak", "raket-alle-reddet", "raket-farve-faerdig", "raket-hov", "raket-wii", "raket-flag", "raket-flag-sat",
        ...FARVER.flatMap(f => [`raket-farve-${f.k}`, `farve-${f.k}`]),
        ...TAL.map((_, i) => `tal-${i + 1}`), ...PLANETS.map(p => `raket-fremme-${p.k}`)]);
      alive = true; timers = []; last = 0;
      r.innerHTML = `<div class="rk">
        <canvas aria-hidden="true"></canvas>
        <div class="rk-count" hidden></div>
        <div class="rk-big"></div>
        <button class="rk-alien" hidden aria-label="Rumvæsen">${ALIEN}</button>
        <button class="rk-go" hidden aria-label="Affyr raketten"></button></div>`;
      root = r.querySelector(".rk");
      cv = root.querySelector("canvas"); c = cv.getContext("2d");
      phase = "pad"; loc = -1; trip = 0; count = 0; goal = 10; mission = "stjerner"; color = FARVER[0];
      cam = 0; clock = 0; hovT = -99; items = []; parts = []; decor = []; meteors = []; rings = [];
      spawnT = 0; decorT = 2; meteorT = 3; ringT = 4; turbo = 0; shake = 0; finishing = false;
      flags = loadFlags();
      sky = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7 }));
      rocket = { x: 0, y: 0, vy: 0, tx: 0, tilt: 0, flame: 0, wob: 0 };
      resize();
      q(".rk-go").onclick = press;
      q(".rk-alien").onclick = hej;
      cv.onpointerdown = pointer; cv.onpointermove = pointer;
      addEventListener("resize", resize);
      raf = requestAnimationFrame(frame);
      dybTest = false;
      if (!dybtLink(Spil.dyb || "")) later(() => showGo(true), 400);
    },
    stop() {
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      removeEventListener("resize", resize);
      try { rumbleSrc && rumbleSrc.stop(); } catch (e) {}
    }
  });
})();
