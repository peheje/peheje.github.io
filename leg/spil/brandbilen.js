// Spil: Brandbilen — et hus brænder, barnet trykker på det, brandbilen kører derhen med udrykning,
// barnet sprøjter vand på ilden med fingeren, og et dyr bliver reddet ned ad stigen. Fest for hver 5 redninger.
// Ingen tabe-tilstand: trykker man på det forkerte hus, siger stemmen bare hvilket hus det er.
(function () {
  const HOUSES = [
    { k: "roed", navn: "røde", col: "#ff7b7b", roof: "#c43f3f", dark: "#b33434" },
    { k: "blaa", navn: "blå", col: "#6fa8ff", roof: "#2f5fb8", dark: "#2a55a5" },
    { k: "groen", navn: "grønne", col: "#6fcf7a", roof: "#2f8a3f", dark: "#2a7a38" },
    { k: "gul", navn: "gule", col: "#ffd75e", roof: "#c99a12", dark: "#b0860f" },
  ];
  const ANIMALS = ["🐱", "🐶", "🐰", "🐹", "🐥", "🐼"];
  const GOAL = 5;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  Spil.css("css-brandbilen", `
    .bb{position:relative;height:100%;overflow:hidden;background:#7cc6f2}
    .bb canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
    .bb-count{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:3;
      background:rgba(255,255,255,.92);border-radius:999px;padding:.1em .6em;font-size:clamp(24px,4.6vh,44px);
      pointer-events:none;box-shadow:0 5px 0 rgba(31,58,95,.25);white-space:nowrap;display:flex;gap:.15em}
    .bb-count span{width:1.2em;height:1.25em;display:flex;align-items:center;justify-content:center}
    .bb-count span.off::before{content:"";width:.8em;height:.8em;border-radius:50%;box-sizing:border-box;
      border:.09em dashed rgba(31,58,95,.35);background:rgba(31,58,95,.06)}
    .bb-big{position:absolute;left:50%;top:26%;transform:translate(-50%,-50%);font-weight:800;font-size:clamp(34px,min(9vh,11vw),90px);
      color:#fff;text-shadow:0 5px 0 rgba(31,58,95,.35);pointer-events:none;z-index:3;width:92%;text-align:center;line-height:1.05}
    .bb-big.pulse{animation:bb-pulse .5s cubic-bezier(.3,1.6,.5,1)}
    @keyframes bb-pulse{from{transform:translate(-50%,-50%) scale(.3);opacity:0}}
    @media (max-width:560px){.bb-count{left:auto;right:12px;transform:none;font-size:clamp(18px,5.4vw,28px)}}
    @media (prefers-reduced-motion:reduce){.bb-big.pulse{animation:none}}
  `);

  let root, cv, c, W, H, raf, last, alive, timers, clock, phase, houses, fireIdx, lastIdx, truck, parts, water, clouds,
    target, spraying, sprayT, jet, idleT, count, animal, rescue, saidGood, hiss, hissGain, siren, L;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* ---------- Layout ---------- */
  function layout() {
    const port = H > W;
    const groundY = H * (port ? .78 : .8), base = groundY - H * .012, margin = W * .04, slot = (W - 2 * margin) / 4;
    // i højformat: høje, smalle rækkehuse med store vinduer
    const hw = slot * (port ? .86 : .8), hh = port ? Math.min(H * .3, hw * 1.9) : Math.min(H * .32, hw * 1.15), roof = port ? hw * .5 : hh * .42;
    houses.forEach((h, i) => {
      h.x = margin + slot * i + (slot - hw) / 2; h.w = hw; h.h = hh; h.base = base; h.roofH = roof;
      h.win = { x: h.x + hw * .5, y: base - hh * (port ? .74 : .68), s: hw * (port ? .5 : .3) };
      h.fireC = { x: h.x + hw * .5, y: base - hh * .78 };
    });
    const tw = port ? Math.min(W * .55, H * .26) : Math.min(W * .3, H * .36);
    L = { groundY, base, tw, th: tw * .42, truckBase: groundY + (H - groundY) * .8, port };
  }
  // Bilen holder med stigen (bagenden) under huset; dir = kørselsretning
  const parkX = (h, dir) => clamp(h.x + h.w * .5 + dir * L.tw * .32, L.tw * .5 + 8, W - L.tw * .5 - 8);
  const pivot = () => ({ x: truck.x - truck.dir * L.tw * .36, y: L.truckBase - L.th - L.th * .12 });
  // Vandkanonen sidder på stigens fod og peger mod fingeren (eller mod ilden)
  function nozzle() {
    const p = pivot(), h = houses[fireIdx], to = target || (h ? h.fireC : { x: p.x, y: 0 });
    const a = Math.atan2(to.y - p.y, to.x - p.x), n = L.th * .34;
    return { p, a, tip: { x: p.x + Math.cos(a) * n, y: p.y + Math.sin(a) * n } };
  }

  /* ---------- Lyd ---------- */
  function sirenOn(sec) {
    try {
      const a = Spil.audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
      o.type = "square";
      for (let i = 0; i * .45 < sec; i++) o.frequency.setValueAtTime(i % 2 ? 660 : 880, t + i * .45);
      lp.type = "lowpass"; lp.frequency.value = 1800;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .05);
      g.gain.setValueAtTime(.07, t + sec - .25); g.gain.exponentialRampToValueAtTime(.0001, t + sec);
      o.connect(lp).connect(g).connect(a.destination); o.start(t); o.stop(t + sec + .05); siren = o;
    } catch (e) {}
  }
  // Vandets sus: en løkke med støj, som skrues op mens der sprøjtes
  function setHiss(on) {
    try {
      const a = Spil.audio();
      if (!hiss) {
        const n = a.sampleRate, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        hiss = a.createBufferSource(); hiss.buffer = b; hiss.loop = true;
        const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = .7;
        hissGain = a.createGain(); hissGain.gain.value = 0;
        hiss.connect(f).connect(hissGain).connect(a.destination); hiss.start();
      }
      hissGain.gain.setTargetAtTime(on ? .09 : 0, a.currentTime, .05);
    } catch (e) {}
  }

  /* ---------- Tegning ---------- */
  function rr(x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function emoji(e, x, y, s) { c.font = `${s}px serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, x, y); }

  // Tegnet sol og skyer (emoji ser forskellige ud på iPad og bliver små og grå)
  function sun(x, y, r) {
    c.save(); c.translate(x, y); if (!still) c.rotate(clock * .15);
    c.strokeStyle = "#ffc93c"; c.lineWidth = r * .22; c.lineCap = "round"; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; c.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); c.lineTo(Math.cos(a) * r * 1.65, Math.sin(a) * r * 1.65); }
    c.stroke(); c.restore();
    c.fillStyle = "#ffd84d"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe98a"; c.beginPath(); c.arc(x - r * .25, y - r * .25, r * .5, 0, Math.PI * 2); c.fill();
  }
  function cloud(x, y, s) {
    const w = s * .55, puff = (col, dy) => {
      c.fillStyle = col;
      rr(x - w * .9, y + dy, w * 1.75, w * .5, w * .25); // rr starter en ny sti, så den kommer først
      [[-.55, .1, .42], [-.15, -.2, .55], [.35, -.05, .48], [.7, .15, .34]].forEach(([dx, yy, r]) => { c.moveTo(x + dx * w + r * w, y + yy * w + dy); c.arc(x + dx * w, y + yy * w + dy, r * w, 0, Math.PI * 2); });
      c.fill();
    };
    puff("rgba(120,170,210,.35)", w * .1); puff("#fff", 0);
  }

  function drawScene() {
    const g = c.createLinearGradient(0, 0, 0, L.base);
    g.addColorStop(0, "#6cbdf0"); g.addColorStop(1, "#d6f0ff");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (L.port) sun(W * .5, H * .17, Math.min(W, H) * .07); else sun(W * .9, H * .1, Math.min(W, H) * .055);
    clouds.forEach(cl => cloud(cl.x * W, cl.y * H, cl.s * Math.min(W, H)));
    // bakker og græs bag husene
    c.fillStyle = "#9edb7e";
    c.beginPath(); c.moveTo(0, L.base - H * .06);
    for (let i = 0; i <= 8; i++) c.quadraticCurveTo(W * (i + .5) / 8, L.base - H * (.1 + (i % 2) * .03), W * (i + 1) / 8, L.base - H * .06);
    c.lineTo(W, L.base); c.lineTo(0, L.base); c.fill();
    // fortov og vej
    c.fillStyle = "#e3ddd2"; c.fillRect(0, L.base, W, L.groundY - L.base + H * .02);
    c.fillStyle = "#5b5f6b"; c.fillRect(0, L.groundY + H * .02, W, H);
    c.fillStyle = "#ffd23f";
    const ry = L.groundY + H * .02 + (H - L.groundY) * .45;
    for (let x = W * .02; x < W; x += W * .12) c.fillRect(x, ry, W * .06, Math.max(4, H * .008));
  }

  function drawHouse(h) {
    c.save();
    if (h.wob > 0) { c.translate(h.x + h.w / 2, h.base); c.rotate(Math.sin(clock * 30) * h.wob * .05); c.translate(-(h.x + h.w / 2), -h.base); }
    const top = h.base - h.h, lw = Math.max(2, h.w * .02);
    c.lineWidth = lw; c.strokeStyle = h.dark; c.lineJoin = "round";
    // skorsten
    c.fillStyle = h.roof; rr(h.x + h.w * .68, top - h.roofH * .85, h.w * .13, h.roofH * .6, 3); c.fill(); c.stroke();
    // krop
    c.fillStyle = h.col; rr(h.x, top, h.w, h.h, 6); c.fill(); c.stroke();
    // tag
    c.fillStyle = h.roof;
    c.beginPath(); c.moveTo(h.x - h.w * .08, top + 2); c.lineTo(h.x + h.w / 2, top - h.roofH); c.lineTo(h.x + h.w * 1.08, top + 2); c.closePath(); c.fill(); c.stroke();
    // dør
    c.fillStyle = h.dark; rr(h.x + h.w * .14, h.base - h.h * .4, h.w * .24, h.h * .4, [h.w * .1, h.w * .1, 0, 0]); c.fill();
    c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(h.x + h.w * .33, h.base - h.h * .2, h.w * .02, 0, Math.PI * 2); c.fill();
    // nederste vindue
    c.fillStyle = "#e6f6ff"; rr(h.x + h.w * .56, h.base - h.h * .4, h.w * .28, h.h * .22, 4); c.fill(); c.stroke();
    // øverste vindue (her sidder dyret)
    const w = h.win, s = w.s, petHere = h.pet && !(rescue && rescue.house === h && rescue.left);
    if (h.fire > 0) { const gl = c.createRadialGradient(w.x, w.y + s * .2, s * .1, w.x, w.y, s * .75); gl.addColorStop(0, "#fff0b8"); gl.addColorStop(1, "#ff8336"); c.fillStyle = gl; }
    else c.fillStyle = "#e6f6ff";
    rr(w.x - s / 2, w.y - s / 2, s, s, 4); c.fill(); c.stroke();
    // vinduet står åbent, mens dyret venter (intet vindueskors, der stikker ud til siderne)
    if (!petHere) {
      c.strokeStyle = "#fff"; c.lineWidth = lw * .8;
      c.beginPath(); c.moveTo(w.x, w.y - s / 2); c.lineTo(w.x, w.y + s / 2); c.moveTo(w.x - s / 2, w.y); c.lineTo(w.x + s / 2, w.y); c.stroke();
    }
    // dyret vipper lidt, som om det kalder på hjælp
    if (petHere) emoji(h.pet, w.x, w.y + s * .06 - (still ? 0 : Math.abs(Math.sin(clock * 4)) * s * .06), s * .82);
    c.restore();
  }

  function flame(x, y, s, i) {
    const f = still ? 1 : .85 + .15 * Math.sin(clock * 18 + i * 2), sh = s * f, w = s * .55, lean = still ? 0 : Math.sin(clock * 9 + i) * s * .12;
    c.fillStyle = "#ff5a1f";
    c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x - w * .7, y - sh * .55, x + lean, y - sh); c.quadraticCurveTo(x + w * .7, y - sh * .55, x + w / 2, y); c.fill();
    c.fillStyle = "#ffb52e";
    c.beginPath(); c.moveTo(x - w * .32, y); c.quadraticCurveTo(x - w * .4, y - sh * .4, x + lean * .7, y - sh * .7); c.quadraticCurveTo(x + w * .4, y - sh * .4, x + w * .32, y); c.fill();
    c.fillStyle = "#fff2a8";
    c.beginPath(); c.moveTo(x - w * .15, y); c.quadraticCurveTo(x - w * .18, y - sh * .25, x + lean * .4, y - sh * .4); c.quadraticCurveTo(x + w * .18, y - sh * .25, x + w * .15, y); c.fill();
  }
  function drawFire(h) {
    if (h.fire <= 0) return;
    const s = h.w * .42 * (.25 + .75 * h.fire), top = h.base - h.h;
    [[h.x + h.w * .2, top + 4, .8], [h.x + h.w * .5, top - h.roofH * .55, 1.1], [h.x + h.w * .8, top + 4, .75],
      [h.win.x - h.win.s * .3, h.win.y - h.win.s * .45, .6], [h.win.x + h.win.s * .3, h.win.y - h.win.s * .45, .55]]
      .forEach(([x, y, m], i) => flame(x, y, s * m, i));
  }

  function drawTruck() {
    const w = L.tw, h = L.th, x = truck.x, yb = L.truckBase - (still ? 0 : Math.abs(Math.sin(clock * 14)) * (truck.moving ? h * .03 : 0));
    const wr = h * .22;
    c.save(); c.translate(x, yb); c.scale(truck.dir, 1);
    c.lineWidth = Math.max(2, w * .012); c.strokeStyle = "#8a1620"; c.lineJoin = "round";
    // kasse og førerhus
    c.fillStyle = "#e8343f"; rr(-w * .5, -h, w * .68, h * .78, 8); c.fill(); c.stroke();
    rr(w * .16, -h * .92, w * .32, h * .7, [14, 14, 6, 6]); c.fill(); c.stroke();
    // dør med håndtag rundt om sideruden
    c.save(); c.lineWidth *= .8; rr(w * .2, -h * .88, w * .255, h * .64, 8); c.stroke(); c.restore();
    c.fillStyle = "#bfe6fb"; rr(w * .28, -h * .84, w * .16, h * .28, 6); c.fill(); c.stroke();
    c.fillStyle = "#fff"; c.fillRect(-w * .48, -h * .52, w * .94, h * .07);
    c.fillStyle = "#8a1620"; rr(w * .215, -h * .68, w * .045, h * .06, 3); c.fill();
    // forlygte
    c.fillStyle = "#fff2a8"; rr(w * .44, -h * .47, w * .055, h * .14, 5); c.fill(); c.stroke();
    // slangerulle
    c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(-w * .2, -h * .62, h * .16, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = "#c99a12"; c.beginPath(); c.arc(-w * .2, -h * .62, h * .08, 0, Math.PI * 2); c.stroke();
    // kofanger
    c.fillStyle = "#9aa3b5"; rr(w * .44, -h * .3, w * .07, h * .12, 3); c.fill();
    // blink på taget
    const on = Math.floor(clock * 6) % 2 === 0 && (truck.moving || phase === "spray" || phase === "drive");
    c.fillStyle = on ? "#4d96ff" : "#1f3a8a"; rr(w * .26, -h * 1.04, w * .1, h * .12, 4); c.fill();
    if (on) { c.fillStyle = "rgba(77,150,255,.35)"; c.beginPath(); c.arc(w * .31, -h * .98, h * .35, 0, Math.PI * 2); c.fill(); }
    // stige (sammenfoldet) hvis den ikke er ude
    if (!rescue || !rescue.ladder) {
      c.strokeStyle = "#c9ccd6"; c.lineWidth = Math.max(3, h * .05);
      c.beginPath(); c.moveTo(-w * .46, -h * 1.08); c.lineTo(w * .12, -h * 1.08); c.moveTo(-w * .46, -h * 1.18); c.lineTo(w * .12, -h * 1.18);
      for (let i = 0; i <= 6; i++) { const xx = -w * .46 + i * w * .58 / 6; c.moveTo(xx, -h * 1.08); c.lineTo(xx, -h * 1.18); }
      c.stroke();
    }
    c.fillStyle = "#c9ccd6"; c.fillRect(-w * .38, -h * 1.08, w * .05, h * .1);
    // hjul
    // hjulkasser, så hjulene sidder inde i bilen og ikke klistret på
    c.fillStyle = "#8a1620";
    [-w * .3, w * .32].forEach(wx => { c.beginPath(); c.arc(wx, -wr * .9, wr * 1.2, Math.PI, 0); c.fill(); });
    [-w * .3, w * .32].forEach(wx => {
      c.fillStyle = "#2b2f3a"; c.beginPath(); c.arc(wx, -wr * .9, wr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#c9ccd6"; c.beginPath(); c.arc(wx, -wr * .9, wr * .45, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#2b2f3a"; c.lineWidth = Math.max(2, wr * .12);
      c.beginPath();
      for (let k = 0; k < 3; k++) { const a = truck.spin + k * Math.PI / 1.5; c.moveTo(wx, -wr * .9); c.lineTo(wx + Math.cos(a) * wr * .42, -wr * .9 + Math.sin(a) * wr * .42); }
      c.stroke();
    });
    c.restore();
  }

  function drawNozzle() {
    const n = nozzle(), r = L.th * .1;
    c.save(); c.translate(n.p.x, n.p.y);
    c.fillStyle = "#c9ccd6"; c.strokeStyle = "#6b7080"; c.lineWidth = Math.max(2, L.th * .025);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.rotate(n.a);
    c.fillStyle = "#ffd23f"; c.strokeStyle = "#b0860f";
    rr(0, -r * .55, L.th * .34, r * 1.1, r * .4); c.fill(); c.stroke();
    c.fillStyle = "#9aa3b5"; rr(L.th * .26, -r * .7, L.th * .08, r * 1.4, r * .3); c.fill();
    c.restore();
  }

  function drawLadder() {
    if (!rescue || !rescue.ladder) return;
    const p = pivot(), t = rescue.top, e = { x: p.x + (t.x - p.x) * rescue.lp, y: p.y + (t.y - p.y) * rescue.lp };
    // bred stige med mørk kant, så den kan ses mod alle husfarver
    const dx = e.x - p.x, dy = e.y - p.y, len = Math.hypot(dx, dy) || 1, half = L.th * .14, nx = -dy / len * half, ny = dx / len * half;
    c.lineCap = "round"; c.beginPath();
    c.moveTo(p.x + nx, p.y + ny); c.lineTo(e.x + nx, e.y + ny); c.moveTo(p.x - nx, p.y - ny); c.lineTo(e.x - nx, e.y - ny);
    const rungs = Math.max(2, Math.round(len / (L.th * .2)));
    for (let i = 1; i < rungs; i++) { const k = i / rungs, x = p.x + dx * k, y = p.y + dy * k; c.moveTo(x + nx, y + ny); c.lineTo(x - nx, y - ny); }
    c.strokeStyle = "#5a5f6e"; c.lineWidth = Math.max(5, L.th * .085); c.stroke();
    c.strokeStyle = "#e4e7ee"; c.lineWidth = Math.max(3, L.th * .05); c.stroke();
  }

  function draw() {
    drawScene();
    houses.forEach(drawHouse);
    parts.forEach(p => { if (p.kind !== "smoke") return; c.globalAlpha = clamp(p.life / p.max, 0, 1) * .6; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); });
    c.globalAlpha = 1;
    houses.forEach(drawFire);
    drawLadder();
    drawTruck();
    if (phase === "spray") drawNozzle();
    // vandstråle: en sammenhængende bue fra kanonen til fingeren, plus dråber
    if (jet) {
      const n = nozzle(), t = n.tip, wob = still ? 0 : Math.sin(clock * 25) * L.th * .02;
      const mx = (t.x + jet.x) / 2, my = (t.y + jet.y) / 2 - Math.hypot(jet.x - t.x, jet.y - t.y) * .18 + wob;
      c.lineCap = "round";
      [[L.th * .17, "rgba(77,184,255,.5)"], [L.th * .1, "#4db8ff"], [L.th * .035, "rgba(255,255,255,.8)"]].forEach(([lw, col]) => {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(t.x, t.y); c.quadraticCurveTo(mx, my, jet.x, jet.y); c.stroke();
      });
      c.fillStyle = "rgba(220,242,255,.9)";
      for (let i = 0; i < 5; i++) { const a = clock * 7 + i * 1.26, rr = L.th * (.06 + .03 * Math.sin(clock * 13 + i)); c.beginPath(); c.arc(jet.x + Math.cos(a) * L.th * .08, jet.y + Math.sin(a) * L.th * .06, rr, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = "#4db8ff";
    water.forEach(d => {
      const k = d.t / d.life, x = d.x0 + (d.x1 - d.x0) * k, y = d.y0 + (d.y1 - d.y0) * k - Math.sin(Math.PI * k) * d.arc;
      c.globalAlpha = .85; c.beginPath(); c.arc(x, y, d.r, 0, Math.PI * 2); c.fill();
    });
    c.globalAlpha = 1;
    parts.forEach(p => { if (p.kind === "smoke") return; c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); });
    c.globalAlpha = 1;
    // dyret på vej ned ad stigen / ved bilen
    if (rescue && rescue.left) emoji(rescue.pet, rescue.px, rescue.py - (rescue.hop ? Math.abs(Math.sin(clock * 8)) * L.th * .3 : 0), rescue.size);
    // hjælpehånd
    if (phase === "spray" && idleT > 2.5 && !spraying) { const h = houses[fireIdx]; emoji("👆", h.fireC.x + h.w * .1, h.fireC.y + h.h * .45 + Math.sin(clock * 6) * 8, Math.min(W, H) * .09); }
    if (phase === "idle" && idleT > 4 && fireIdx >= 0) { const h = houses[fireIdx]; emoji("👆", h.x + h.w * .5, h.base - h.h * .2 + Math.sin(clock * 6) * 8, Math.min(W, H) * .09); }
  }

  /* ---------- Opdatering ---------- */
  function update(dt) {
    clock += dt; idleT += dt;
    if (!still) clouds.forEach(cl => { cl.x += cl.v * dt; if (cl.x > 1.15) cl.x = -.15; });
    houses.forEach(h => { h.wob = Math.max(0, h.wob - dt * 2); });
    const h = fireIdx >= 0 ? houses[fireIdx] : null;
    // røg fra det brændende hus
    if (h && h.fire > 0 && Math.random() < dt * 14 * h.fire) {
      parts.push({ kind: "smoke", x: h.x + h.w * (.3 + Math.random() * .4), y: h.base - h.h - h.roofH * .6, vx: (Math.random() - .3) * W * .02, vy: -H * (.06 + Math.random() * .05),
        r: h.w * .06, grow: h.w * .1, life: 2.2, max: 2.2, col: "#6b6f7a" });
    }
    if (phase === "drive") {
      truck.t = Math.min(1, truck.t + dt / truck.dur);
      const nx = truck.from + (truck.to - truck.from) * ease(truck.t);
      // bilen tegnes spejlvendt når den kører mod venstre, så drejningen ganges med retningen
      truck.spin += truck.dir * (nx - truck.x) / (L.th * .22); truck.x = nx; truck.moving = truck.t < 1;
      if (truck.t >= 1) arriveTruck();
    }
    if (phase === "spray") {
      sprayT = Math.max(0, sprayT - dt);
      const on = spraying || sprayT > 0;
      setHiss(on);
      jet = on && target ? target : null;
      if (on && target) {
        idleT = 0;
        const p = nozzle().tip;
        for (let i = 0; i < 3; i++) water.push({ x0: p.x, y0: p.y, x1: target.x + (Math.random() - .5) * 18, y1: target.y + (Math.random() - .5) * 18,
          t: 0, life: .32, r: L.th * (.035 + Math.random() * .03), arc: Math.hypot(target.x - p.x, target.y - p.y) * .18 });
        if (Math.hypot(target.x - h.fireC.x, target.y - h.fireC.y) < Math.max(h.w * .8, 70)) { // generøs radius til små fingre
          h.fire = Math.max(0, h.fire - dt * .34);
          if (Math.random() < dt * 20) parts.push({ kind: "smoke", x: target.x + (Math.random() - .5) * h.w * .3, y: target.y, vx: (Math.random() - .5) * W * .03, vy: -H * .08,
            r: h.w * .05, grow: h.w * .12, life: 1.2, max: 1.2, col: "#ffffff" });
          // "Godt! Bliv ved!" skal kunne tale færdig, før "Ilden er slukket!" kommer, og må ikke afbryde en anden replik
          if (h.fire < .72 && h.fire > .6 && !saidGood && !Spil.isTalking()) { saidGood = true; Spil.say("Godt! Bliv ved!", null, "brand-godt"); }
          if (h.fire <= 0) extinguished();
        }
      }
    }
    if (rescue) updateRescue(dt);
    water.forEach(d => {
      d.t += dt;
      if (d.t >= d.life && Math.random() < .3) parts.push({ kind: "drop", x: d.x1, y: d.y1, vx: (Math.random() - .5) * W * .1, vy: -H * .1 * Math.random(), r: d.r * .7, grow: 0, life: .4, max: .4, col: "#9fd8ff", g: true });
    });
    water = water.filter(d => d.t < d.life);
    parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += H * 1.5 * dt; p.r += p.grow * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
  }

  function updateRescue(dt) {
    const r = rescue;
    if (r.stage === "ladder") {
      r.lp = Math.min(1, r.lp + dt / .9);
      if (r.lp >= 1) { r.stage = "climb"; r.k = 0; r.left = true; }
    } else if (r.stage === "climb") {
      r.k = Math.min(1, r.k + dt / 2.2);
      const p = pivot(), w = r.house.win, gx = p.x - truck.dir * L.tw * .1, gy = L.truckBase - r.size * .5;
      if (r.k < .65) { const k = r.k / .65; r.px = w.x + (p.x - w.x) * k; r.py = w.y + (p.y - w.y) * k - r.size * .3; }
      else { const k = (r.k - .65) / .35; r.px = p.x + (gx - p.x) * k; r.py = p.y - r.size * .3 + (gy - (p.y - r.size * .3)) * k - Math.sin(Math.PI * k) * L.th * .5; }
      if (r.k >= 1) { r.stage = "done"; r.hop = true; r.lp = 1; rescued(); }
    }
  }

  /* ---------- Faser ---------- */
  function big(txt) {
    const b = q(".bb-big"); b.textContent = txt; b.classList.remove("pulse");
    if (txt) { void b.offsetWidth; b.classList.add("pulse"); }
  }
  function counter() {
    q(".bb-count").innerHTML = Array.from({ length: GOAL }, (_, i) => `<span class="${i < count ? "" : "off"}">${i < count ? ANIMALS[i % ANIMALS.length] : ""}</span>`).join("");
  }

  function newFire(fast) {
    let i; if (fast >= 0) i = fast; else do { i = Math.random() * houses.length | 0; } while (i === lastIdx);
    lastIdx = fireIdx = i;
    const h = houses[i]; h.fire = 1; h.pet = animal = ANIMALS[count % ANIMALS.length];
    phase = "idle"; idleT = 0; saidGood = false; rescue = null;
    Spil.tone([520, 440, 520, 440], .12, "triangle");
    prompt();
  }
  function prompt() {
    if (phase !== "idle") return;
    const h = houses[fireIdx];
    Spil.say(`Det ${h.navn} hus brænder! Tryk på det!`, null, `brand-brand-${h.k}`);
    later(() => { if (phase === "idle" && idleT > 8) { idleT = 4.5; prompt(); } }, 9500);
  }

  function hitHouse(x, y) {
    return houses.findIndex(h => x > h.x - h.w * .08 && x < h.x + h.w * 1.08 && y > h.base - h.h - h.roofH && y < h.base + H * .02);
  }

  function tapHouse(i) {
    const h = houses[i];
    if (i === fireIdx) {
      Spil.sfx.click();
      phase = "drive"; idleT = 0;
      truck.dir = h.x + h.w / 2 >= truck.x ? 1 : -1; truck.from = truck.x; truck.to = parkX(h, truck.dir); truck.t = 0;
      truck.dur = clamp(Math.abs(truck.to - truck.from) / (W * .45), 1.3, 2.6); truck.moving = true;
      sirenOn(truck.dur + .4);
      Spil.say("Afsted! Brandbilen kører!", null, "brand-afsted");
    } else {
      h.wob = 1; Spil.tone([330, 280], .1, "triangle");
      Spil.say(`Det er det ${h.navn} hus.`, null, `brand-er-${h.k}`);
    }
  }

  function arriveTruck() {
    truck.moving = false;
    phase = "spray"; idleT = 0; sprayT = 0;
    // vent til "Afsted! Brandbilen kører!" er talt færdig (barnet kan godt sprøjte imens)
    const ask = () => {
      if (phase !== "spray" || houses[fireIdx].fire < .9) return; // er barnet allerede godt i gang, behøver vi ikke sige det
      if (Spil.isTalking()) later(ask, 150); else Spil.say("Sprøjt vand på ilden!", null, "brand-sproejt");
    };
    ask();
  }

  function extinguished() {
    const h = houses[fireIdx];
    phase = "rescue"; spraying = false; jet = null; setHiss(false); water = [];
    for (let i = 0; i < 10; i++) parts.push({ kind: "smoke", x: h.x + h.w * Math.random(), y: h.base - h.h * Math.random(), vx: (Math.random() - .5) * W * .04, vy: -H * .1,
      r: h.w * .06, grow: h.w * .15, life: 1.6, max: 1.6, col: "#ffffff" });
    Spil.sfx.right(); big("Ilden er slukket!");
    const w = h.win;
    rescue = { house: h, pet: h.pet, stage: "ladder", lp: 0, top: { x: w.x, y: w.y + w.s * .55 }, ladder: true, left: false,
      size: w.s * .9, px: w.x, py: w.y, k: 0 };
    Spil.say("Ilden er slukket!", null, "brand-slukket");
  }

  function rescued() {
    const r = rescue, cr = root.getBoundingClientRect();
    r.house.pet = null; count++; counter();
    Spil.burst(cr.left + r.px, cr.top + r.py, "💖✨💛✨💖✨");
    Spil.tone([660, 880, 1100], .1);
    big("");
    // Fremdriften må ikke hænge på at replikken får lov at tale ud (reserve-timer)
    let go = false; const onward = () => { if (!go) { go = true; later(next, 900); } };
    Spil.say("Tak, brandmand!", onward, "brand-tak"); later(onward, 4500);
  }

  function next() {
    rescue = null;
    if (count >= GOAL) {
      phase = "party";
      big("Super brandmand!");
      Spil.sfx.fanfare();
      const cr = root.getBoundingClientRect();
      for (let i = 0; i < 4; i++) later(() => Spil.burst(cr.left + W * (.2 + Math.random() * .6), cr.top + H * (.25 + Math.random() * .3), "🎉⭐🚒💦🎉⭐🚒💦"), i * 350);
      let go = false;
      const onward = () => { if (!go) { go = true; later(() => { count = 0; counter(); big(""); newFire(); }, 1200); } };
      Spil.say("Du er en super brandmand!", onward, "brand-super"); later(onward, 6000);
      return;
    }
    later(newFire, 300);
  }

  function pointer(e) {
    const r = root.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.type === "pointerdown") {
      if (phase === "idle") { const i = hitHouse(x, y); if (i >= 0) tapHouse(i); return; }
      if (phase === "spray") { spraying = true; target = { x, y }; sprayT = .45; return; }
    } else if (e.type === "pointermove") {
      if (phase === "spray" && (spraying || e.pointerType === "touch")) { target = { x, y }; sprayT = Math.max(sprayT, .15); }
    } else {
      spraying = false;
    }
  }

  function resize() {
    if (!alive) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    if (fireIdx >= 0 && phase !== "drive" && truck.x > -L.tw) truck.x = parkX(houses[fireIdx], truck.dir);
  }

  function frame(t) {
    if (!alive) return;
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    update(dt); draw();
    root.dataset.phase = phase; root.dataset.fire = fireIdx; // bruges af tests
    raf = requestAnimationFrame(frame);
  }

  // Dybt link til test (Spil.dyb): "brand" = det blå hus brænder, "sproejt" = bilen holder klar til at sprøjte,
  // "redning" = ilden er netop slukket og dyret reddes, "fest" = sidste redning før festen,
  // "venstre" = bilen kører mod venstre hen til det røde hus.
  function dybtLink(dyb) {
    if (dyb === "venstre") {
      counter(); newFire(0); truck.dir = -1; truck.x = W - L.tw * .6; tapHouse(0);
      return true;
    }
    if (!["brand", "sproejt", "redning", "fest"].includes(dyb)) return false;
    if (dyb === "fest") count = GOAL - 1;
    counter(); newFire(1);
    if (dyb === "brand") return true;
    const h = houses[1];
    truck.dir = 1; truck.x = parkX(h, 1);
    if (dyb === "sproejt") { arriveTruck(); return true; }
    phase = "spray"; h.fire = 0; extinguished();
    return true;
  }

  Spil.register({
    id: "brandbilen", navn: "Brandbilen", ikon: "🚒", farve: "#ffb3a7",
    start(r) {
      Spil.preload(["brand-afsted", "brand-sproejt", "brand-godt", "brand-slukket", "brand-tak", "brand-super",
        ...HOUSES.flatMap(h => [`brand-brand-${h.k}`, `brand-er-${h.k}`])]);
      alive = true; timers = []; last = 0; clock = 0;
      r.innerHTML = `<div class="bb"><canvas aria-hidden="true"></canvas><div class="bb-count" aria-label="Reddede dyr"></div><div class="bb-big"></div></div>`;
      root = r.querySelector(".bb"); cv = root.querySelector("canvas"); c = cv.getContext("2d");
      houses = HOUSES.map(h => ({ ...h, fire: 0, wob: 0, pet: null }));
      clouds = [{ x: .15, y: .12, s: .12, v: .012 }, { x: .55, y: .2, s: .09, v: .008 }, { x: .85, y: .08, s: .1, v: .01 }];
      parts = []; water = []; rescue = null; fireIdx = -1; lastIdx = -1; count = 0; spraying = false; sprayT = 0; jet = null; idleT = 0; target = null;
      phase = "start"; hiss = null; hissGain = null;
      resize();
      truck = { x: -L.tw, from: 0, to: 0, t: 0, dur: 1, dir: 1, spin: 0, moving: false };
      counter();
      cv.onpointerdown = cv.onpointermove = cv.onpointerup = cv.onpointercancel = cv.onpointerleave = pointer;
      addEventListener("resize", resize);
      raf = requestAnimationFrame(frame);
      if (!dybtLink(Spil.dyb || "")) later(newFire, 600);
    },
    stop() {
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      removeEventListener("resize", resize);
      try { siren && siren.stop(); } catch (e) {}
      try { hiss && hiss.stop(); hissGain && hissGain.disconnect(); } catch (e) {}
    }
  });
})();
