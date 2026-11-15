// Spil: Rullebanen — et lille pindsvin har rullet sig sammen og skal hjem til sin hule.
// Hver bane er én skærm med tyngdekraft. Barnet klipper snore (stryg over dem) eller trækker
// pindsvinet tilbage og giver slip, så det bliver kastet. Æbler undervejs er en frivillig bonus.
// Banerne foregår over jorden (solskin) og under jorden (hyggeligt dunkelt med lysende svampe).
// Ingen tabe-tilstand: ryger pindsvinet ud eller går i stå, triller det bare tilbage til start,
// og efter et par forsøg viser en hånd, hvad man kan gøre.
//
// Opbygning:
//   spil/rullebanen-baner.js  — banerne som data (window.RULLEBANER). Nye baner tilføjes der.
//   spil/rullebanen.js        — motoren: fysik, tegning, styring, banekort.
// Verden er altid 100 × 160 enheder (stående), x mod højre og y nedad. Den skaleres til skærmen;
// på en bred skærm fortsætter landskabet ud til siderne.
(function () {
  const VB = 100, VH = 160;           // verdens størrelse
  const G = 260;                      // tyngdekraft (enheder/s²)
  const R = 5;                        // pindsvinets radius
  const H = 1 / 240;                  // fysikkens tidsskridt
  const K = 6, MAX_TRAEK = 26;        // kast: fart pr. enhed man trækker, og hvor langt man kan trække
  const MAXV = 320;                   // fartgrænse (så intet ryger gennem væggene)
  const ROPE_LED = 14;                // led i en snor
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  const GEM = "lk-rullebanen";

  /* =====================================================================
     Fysik: verlet-partikler (pindsvin + snorenes led), afstandsbånd og kollision med linjestykker
     ===================================================================== */
  const P = (x, y, w) => ({ x, y, px: x, py: y, w });
  const seg = (a, b, t, ekstra) => Object.assign({ ax: a[0], ay: a[1], bx: b[0], by: b[1], t }, ekstra);

  // Bygger en spilbar verden ud fra en banes data. Bruges både af spillet og af den automatiske test.
  function byg(def) {
    const w = {
      def, tema: def.tema || "over", statics: [], ropes: [], parts: [], aebler: [], jord: [], planker: [], trampoliner: [],
      hule: null, slynge: null, status: "spil", tid: 0, stille: 0, fundet: 0, haendelser: [],
      ball: Object.assign(P(def.start[0], def.start[1], 1 / 6), { r: R, rot: 0, spin: 0, fast: false, kontakt: false }),
    };
    (def.elementer || []).forEach(e => {
      const lav = ELEMENTER[e.type];
      if (lav) lav(w, e); else console.warn("Rullebanen: ukendt element", e.type);
    });
    return w;
  }

  // Elementtyper. Et nyt element = en ny funktion her (+ evt. tegning i tegnVerden).
  const ELEMENTER = {
    // Jord/vægge: en brudt linje. fyld: "ned" (jorden er under linjen), "op" (loft), "ingen" (en tyk væg/rod).
    jord(w, e) {
      for (let i = 0; i < e.punkter.length - 1; i++) w.statics.push(seg(e.punkter[i], e.punkter[i + 1], e.tyk ?? 1, { slags: "jord" }));
      w.jord.push(e);
    },
    planke(w, e) { w.statics.push(seg(e.fra, e.til, 1.4, { slags: "planke" })); w.planker.push(e); },
    trampolin(w, e) { w.statics.push(seg(e.fra, e.til, 1.4, { slags: "trampolin", hop: e.hop ?? 175 })); w.trampoliner.push(e); },
    aeble(w, e) { w.aebler.push({ x: e.x, y: e.y, taget: false }); },
    hule(w, e) { w.hule = { x: e.x, y: e.y, r: e.r ?? 8 }; },
    // Slynge: et blad/svampehat, som pindsvinet ligger på og kan kastes fra
    slynge(w, e) {
      w.statics.push(seg([e.x - 6, e.y], [e.x + 6, e.y], 1, { slags: "slynge" }));
      w.slynge = { x: e.x, y: e.y, hx: e.x, hy: e.y - 1 - R };
      const b = w.ball; b.x = b.px = e.x; b.y = b.py = e.y - 1 - R;
    },
    // Snor fra et anker til pindsvinet. slap > 1 giver en løsere snor.
    snor(w, e) {
      const b = w.ball, a = P(e.anker[0], e.anker[1], 0);
      const pts = [a];
      for (let i = 1; i < ROPE_LED; i++) {
        const t = i / ROPE_LED;
        pts.push(P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3)); // let snor, tungt pindsvin
      }
      pts.push(b);
      const laengde = Math.hypot(b.x - a.x, b.y - a.y) * (e.slap ?? 1);
      const led = [];
      for (let i = 0; i < pts.length - 1; i++) led.push({ a: pts[i], b: pts[i + 1], rest: laengde / ROPE_LED, on: true });
      w.ropes.push({ anker: a, pts, led });
      pts.slice(1, -1).forEach(p => w.parts.push(p));
    },
  };

  const holderSnor = w => w.ropes.some(r => r.led.every(l => l.on));
  const vedSlynge = w => w.slynge && Math.hypot(w.ball.x - w.slynge.hx, w.ball.y - w.slynge.hy) < 4;
  const fart = b => Math.hypot(b.x - b.px, b.y - b.py) / H;

  function kollider(w, s) {
    const b = w.ball;
    const ex = s.bx - s.ax, ey = s.by - s.ay, l2 = ex * ex + ey * ey || 1e-9;
    const t = Math.max(0, Math.min(1, ((b.x - s.ax) * ex + (b.y - s.ay) * ey) / l2));
    const cx = s.ax + ex * t, cy = s.ay + ey * t;
    let dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    const min = b.r + s.t;
    if (d >= min) return;
    if (d < 1e-6) { dx = -ey; dy = ex; d = Math.hypot(dx, dy); }
    const nx = dx / d, ny = dy / d;
    let vx = (b.x - b.px) / H, vy = (b.y - b.py) / H;
    b.x += nx * (min - d); b.y += ny * (min - d);
    const vn = vx * nx + vy * ny;
    if (vn < 0) {
      let tx = vx - vn * nx, ty = vy - vn * ny;
      const rul = Math.max(0, 1 - 0.35 * H);           // lidt rullemodstand
      tx *= rul; ty *= rul;
      let ny2;
      if (s.slags === "trampolin") { ny2 = Math.max(-vn * 1.05, s.hop); w.haendelser.push("boing"); }
      else ny2 = -vn < 18 ? 0 : -vn * 0.28;            // små stød bliver bare liggende
      if (-vn > 70 && s.slags !== "trampolin") w.haendelser.push("bump");
      vx = tx + nx * ny2; vy = ty + ny * ny2;
      b.px = b.x - vx * H; b.py = b.y - vy * H;
    }
    b.kontakt = true; b.nx = nx; b.ny = ny;
  }

  // Ét fysik-skridt. Returnerer intet; hændelser (lyde) lægges i w.haendelser.
  function trin(w) {
    if (w.status !== "spil") return;
    w.tid += H;
    const b = w.ball, g = G * H * H;
    // Bevæg partiklerne
    for (const p of w.parts) {
      const vx = (p.x - p.px) * .998, vy = (p.y - p.py) * .998;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g;
    }
    if (!b.fast) {
      const vx = (b.x - b.px) * .9995, vy = (b.y - b.py) * .9995;
      b.px = b.x; b.py = b.y; b.x += vx; b.y += vy + g;
    }
    // Snorene: led må ikke være længere end deres længde (men gerne slappe)
    const bw = b.w;
    if (b.fast) b.w = 0;
    for (let it = 0; it < 12; it++) {
      for (const r of w.ropes) for (const l of r.led) {
        if (!l.on) continue;
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, d = Math.hypot(dx, dy) || 1e-9;
        if (d <= l.rest) continue;
        const ws = l.a.w + l.b.w; if (!ws) continue;
        const k = (d - l.rest) / d / ws;
        l.a.x += dx * k * l.a.w; l.a.y += dy * k * l.a.w;
        l.b.x -= dx * k * l.b.w; l.b.y -= dy * k * l.b.w;
      }
    }
    b.w = bw;
    // Kollision med jord, planker og trampoliner
    if (!b.fast) {
      b.kontakt = false;
      for (let it = 0; it < 2; it++) for (const s of w.statics) kollider(w, s);
      // fartgrænse
      const vx = (b.x - b.px) / H, vy = (b.y - b.py) / H, v = Math.hypot(vx, vy);
      if (v > MAXV) { b.px = b.x - vx / v * MAXV * H; b.py = b.y - vy / v * MAXV * H; }
      // rulning: på jorden følger drejningen farten; i luften fortsætter den
      if (b.kontakt) b.spin = ((b.x - b.px) * -b.ny + (b.y - b.py) * b.nx) / b.r;
      b.rot += b.kontakt ? b.spin : b.spin * .995;
    }
    // Æbler
    for (const a of w.aebler) if (!a.taget && Math.hypot(a.x - b.x, a.y - b.y) < b.r + 3.5) {
      a.taget = true; w.fundet++; w.haendelser.push("aeble");
    }
    // Hjemme?
    if (w.hule && Math.hypot(w.hule.x - b.x, w.hule.y - b.y) < w.hule.r) { w.status = "hjemme"; w.haendelser.push("hjemme"); return; }
    // Ude af banen?
    if (b.y > VH + 15 || b.x < -18 || b.x > VB + 18 || b.y < -60) { w.status = "hov"; w.haendelser.push("hov"); return; }
    // Gået i stå et sted, hvor der ikke sker mere?
    const stoppet = !b.fast && !holderSnor(w) && !vedSlynge(w) && fart(b) < 6;
    w.stille = stoppet ? w.stille + H : 0;
    if (w.stille > 1.8) { w.status = "hov"; w.haendelser.push("hov"); }
  }

  // Klip: et strøg fra p til q skærer alle snore, det krydser
  function krydser(p, q, a, b) {
    const d = (q[0] - p[0]) * (b.y - a.y) - (q[1] - p[1]) * (b.x - a.x);
    if (Math.abs(d) < 1e-9) return false;
    const u = ((a.x - p[0]) * (b.y - a.y) - (a.y - p[1]) * (b.x - a.x)) / d;
    const v = ((a.x - p[0]) * (q[1] - p[1]) - (a.y - p[1]) * (q[0] - p[0])) / d;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }
  function klip(w, p, q) {
    let klippet = null;
    for (const r of w.ropes) for (const l of r.led) if (l.on && krydser(p, q, l.a, l.b)) {
      l.on = false; klippet = l;
      r.led[r.led.length - 1].on = false; // det afklippede stykke slipper pindsvinet og falder væk
    }
    return klippet;
  }
  // Kast: træk er vektoren fra hvilestedet til hvor man har trukket pindsvinet hen
  function kast(w, traek) {
    const b = w.ball, s = w.slynge;
    b.fast = false;
    // Kastet starter altid fra hvilestedet (man kan godt trække pindsvinet "ned i" jorden, mens man sigter)
    b.x = s.hx; b.y = s.hy;
    b.px = b.x + traek[0] * K * H; b.py = b.y + traek[1] * K * H;
    // I luften ruller pindsvinet fremad, i samme tempo som når det triller med den fart på jorden
    // (før drejede det baglæns og ca. fire gange for hurtigt). Kun tegningen; fysikken er den samme.
    b.spin = -traek[0] * K * H / R;
  }
  const begraensTraek = (dx, dy) => { const l = Math.hypot(dx, dy); return l > MAX_TRAEK ? [dx / l * MAX_TRAEK, dy / l * MAX_TRAEK] : [dx, dy]; };

  // Kører en bane uden skærm, med banens hjælp som handlinger. Til den automatiske test.
  function simuler(def, handlinger = def.hjaelp || [], maxSek = 10) {
    const w = byg(def);
    const koe = handlinger.map((h, i) => Object.assign({ t: h.t ?? (0.4 + i * 0.9) }, h));
    while (w.status === "spil" && w.tid < maxSek) {
      while (koe.length && w.tid >= koe[0].t) {
        const h = koe.shift();
        if (h.type === "klip") klip(w, h.fra, h.til);
        if (h.type === "kast") kast(w, begraensTraek(...h.traek));
      }
      trin(w);
    }
    return { resultat: w.status === "spil" ? "tid" : w.status, aebler: w.fundet, af: w.aebler.length, tid: +w.tid.toFixed(2) };
  }

  /* =====================================================================
     Lyde (synth)
     ===================================================================== */
  function stoej(dur, freq, type = "bandpass", vol = .25, til = 0) {
    try {
      const a = Spil.audio(), t = a.currentTime, n = Math.ceil(a.sampleRate * dur);
      const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = buf; f.type = type; f.frequency.setValueAtTime(freq, t);
      if (til) f.frequency.exponentialRampToValueAtTime(til, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur);
    } catch (e) {}
  }
  function toneGlid(f1, f2, dur, type = "sine", vol = .25) {
    try {
      const a = Spil.audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
    } catch (e) {}
  }
  const LYD = {
    klip: () => { stoej(.09, 4200, "highpass", .3); toneGlid(1400, 700, .08, "triangle", .08); },
    boing: () => toneGlid(160, 520, .32, "sine", .3),
    aeble: () => { Spil.tone([880, 1175, 1568], .07, "sine"); },
    bump: () => { toneGlid(140, 70, .12, "sine", .25); stoej(.06, 300, "bandpass", .12); },
    kast: () => stoej(.35, 500, "bandpass", .2, 2400),
    hov: () => toneGlid(500, 220, .35, "triangle", .2),
    hjemme: () => Spil.sfx.fanfare(),
  };
  let sidstLyd = {};
  function lyd(k) {
    const nu = performance.now();
    if (nu - (sidstLyd[k] || 0) < 90) return; // samme lyd mange gange på én gang lyder grimt
    sidstLyd[k] = nu; LYD[k] && LYD[k]();
  }

  /* =====================================================================
     Tegning
     Én fælles stil for alt: lyset kommer fra oven til venstre, flader har en blød farveovergang,
     en mørk, varm streg rundt om (STREG) og et lille lyst glimt. Nye ting bør bruge hjælperne herunder,
     så alt på banen har samme detaljegrad.
     ===================================================================== */
  // Lille fast tilfældighed, så sten/rødder ser ens ud hver gang
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  const STREG = .45, BLYANT = "#4a2f1a", BLOED = "rgba(60,34,14,.6)";
  // Fyld og omrids af den sti, der lige er lagt
  const fyldOgStreg = (c, fyld, streg = BLYANT, bred = STREG) => {
    c.fillStyle = fyld; c.fill();
    if (streg) { c.lineJoin = "round"; c.strokeStyle = streg; c.lineWidth = bred; c.stroke(); }
  };
  const lodret = (c, y0, y1, ...farver) => { const g = c.createLinearGradient(0, y0, 0, y1); farver.forEach((f, i) => g.addColorStop(i / (farver.length - 1), f)); return g; };
  // Farveovergang til noget rundt: lyst oppe til venstre, mørkt i kanten
  const kugle = (c, x, y, r, lys, mork) => { const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .08, x, y, r * 1.05); g.addColorStop(0, lys); g.addColorStop(1, mork); return g; };
  const glimt = (c, x, y, rx, ry, rot = -.6, a = .6) => { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
  const gloed = (c, x, y, r, rgb, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  };
  // Går langs en brudt linje i faste skridt og kalder fn(x, y, nr) for hvert sted
  function langs(p, skridt, fn) {
    let k = 0, rest = skridt / 2;
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i], [bx, by] = p[i + 1], l = Math.hypot(bx - ax, by - ay);
      if (l < .01) continue;
      for (; rest <= l; rest += skridt) fn(ax + (bx - ax) * rest / l, ay + (by - ay) * rest / l, k++, i);
      rest -= l;
    }
  }

  // Højden af den nærmeste jord/planke lige under (x, y). Bruges til at sætte ting ned på jorden,
  // så hule, svampe, blade og trampoliner står på bakken, også når den er skrå.
  function jordUnder(w, x, y) {
    w._jc = w._jc || {};
    const k = x.toFixed(1) + "|" + y.toFixed(1);
    if (k in w._jc) return w._jc[k];
    let best = null;
    for (const st of w.statics) {
      if (st.slags !== "jord" && st.slags !== "planke") continue;
      const x0 = Math.min(st.ax, st.bx), x1 = Math.max(st.ax, st.bx);
      if (x1 - x0 < .5 || x < x0 || x > x1) continue;
      const yy = st.ay + (st.by - st.ay) * (x - st.ax) / (st.bx - st.ax) - st.t;
      if (yy >= y - 2 && (best == null || yy < best)) best = yy;
    }
    return (w._jc[k] = best);
  }
  const paaJord = (w, x, y, maks = 40) => { const g = jordUnder(w, x, y); return g != null && g - y < maks ? g : y + 6; };

  const TEMA = {
    over: { himmel: ["#5db9ee", "#a9defa", "#e9f7ff"], jord: ["#bd8756", "#8f5e37", "#6c4426"], kant: "#5cb043", kant2: "#9ade74", kantM: "#3d8a31" },
    under: { himmel: ["#3b2a21", "#2a1c14", "#170f0a"], jord: ["#6d4c35", "#4b3220", "#2f1e12"], kant: "#8d6546", kant2: "#b98d66", kantM: "#3d2717" },
  };
  const TRAE = { lys: "#c99a66", mellem: "#a47143", mork: "#73492a", ende: "#efd09c", ring: "#b98a52" };

  /* ---------- Baggrund (i skærmens pixels) ---------- */
  function tegnSky(c, x, y, r) {
    const boller = [[0, 0, 1], [1.05, -.42, 1.25], [2.2, -.1, 1.05], [3.1, .15, .72], [-.85, .22, .68]];
    const sti = dy => { c.beginPath(); boller.forEach(([bx, by, br]) => { c.moveTo(x + (bx + br) * r, y + by * r + dy); c.arc(x + bx * r, y + by * r + dy, br * r, 0, 7); }); };
    c.save(); c.beginPath(); c.rect(x - 2.2 * r, y - 2.4 * r, 7 * r, 3.05 * r); c.clip(); // flad bund
    c.fillStyle = "#cfe4f3"; sti(0); c.fill();
    c.fillStyle = "#ffffff"; sti(-.2 * r); c.fill();
    c.restore();
  }
  // En række bløde bakker langt væk, der toner ud i disen forneden (så de ikke ligner jord, man kan lande på)
  function tegnBakker(c, cw, ch, y0, amp, top, bund, fase, traeer) {
    const yv = x => y0 - amp * (.5 + .5 * Math.sin(x / (ch * .34) + fase)) - amp * .3 * Math.sin(x / (ch * .13) + fase * 2.3);
    c.beginPath(); c.moveTo(-20, ch);
    for (let x = -20; x <= cw + 20; x += 16) c.lineTo(x, yv(x));
    c.lineTo(cw + 20, ch); c.closePath();
    c.fillStyle = lodret(c, y0 - amp * 1.3, y0 + ch * .22, top, bund); c.fill();
    if (traeer) {
      // små træer på bakkekammen
      c.fillStyle = top;
      for (let x = 30 + hash(fase) * 60, k = 0; x < cw; x += 70 + hash(k + fase) * 150, k++) {
        const y = yv(x), h = ch * (.022 + hash(k + 9) * .02);
        [[0, -1.1, .8], [-.6, -.5, .6], [.6, -.5, .6]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * h, y + dy * h, r * h, 0, 7); c.fill(); });
      }
    }
  }
  function tegnBaggrund(c, v, cw, ch, t) {
    const th = TEMA[v.tema], ro = RM.matches;
    c.fillStyle = lodret(c, 0, ch, ...th.himmel); c.fillRect(0, 0, cw, ch);
    if (v.tema === "over") {
      tegnBakker(c, cw, ch, ch * .6, ch * .085, "#8fc9ea", "#e3f4fd", 1.3, false);
      // skyer der driver hen over hele skærmen (bag de nære bakker)
      c.globalAlpha = .95;
      [[.1, .1, 1], [.5, .22, .7], [.82, .06, .85], [.3, .36, .55]].forEach(([x, y, k], i) => {
        const r = 24 * k * Math.max(1, cw / 900);
        tegnSky(c, ((x * cw + (ro ? 0 : t * (7 + i * 3.5))) % (cw + 260)) - 130, y * ch, r);
      });
      c.globalAlpha = 1;
      tegnBakker(c, cw, ch, ch * .7, ch * .06, "#9fd9b6", "#e6f6ee", 4.1, true);
      // fnug i luften
      c.fillStyle = "rgba(255,255,255,.75)";
      for (let i = 0; i < 9; i++) {
        const x = (hash(i + 3) * cw + (ro ? 0 : t * (9 + hash(i) * 8))) % cw, y = ch * (.15 + .6 * hash(i + 40)) + (ro ? 0 : Math.sin(t * .7 + i * 2) * 14);
        c.beginPath(); c.arc(x, y, 1.2 + hash(i + 70) * 1.3, 0, 7); c.fill();
      }
    } else {
      // klippevæggen bagest: store, bløde klumper i lidt lysere og mørkere jord
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? "rgba(255,214,170,.035)" : "rgba(0,0,0,.16)";
        c.beginPath(); c.ellipse(hash(i + 2) * cw, hash(i + 31) * ch, (.08 + hash(i + 5) * .14) * ch + 30, (.05 + hash(i + 8) * .08) * ch + 20, hash(i) - .5, 0, 7); c.fill();
      }
      // drypsten langt inde i hulen
      c.fillStyle = "rgba(0,0,0,.2)";
      for (let x = hash(7) * 60, k = 0; x < cw; x += 50 + hash(k + 12) * 110, k++) {
        const b = 14 + hash(k + 3) * 22, h = ch * (.06 + hash(k + 21) * .16), op = k % 3 === 1;
        c.beginPath();
        if (op) { c.moveTo(x - b, ch); c.quadraticCurveTo(x - b * .2, ch - h * .5, x, ch - h); c.quadraticCurveTo(x + b * .2, ch - h * .5, x + b, ch); }
        else { c.moveTo(x - b, 0); c.quadraticCurveTo(x - b * .2, h * .5, x, h); c.quadraticCurveTo(x + b * .2, h * .5, x + b, 0); }
        c.fill();
      }
      // en svag varm glød fra midten
      const gl = c.createRadialGradient(cw / 2, ch * .45, 10, cw / 2, ch * .45, Math.max(cw, ch) * .7);
      gl.addColorStop(0, "rgba(255,190,120,.13)"); gl.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gl; c.fillRect(0, 0, cw, ch);
    }
  }

  /* ---------- Jord, vægge og planker (står stille; tegnes én gang pr. bane til et lag) ---------- */
  // En træstamme i egne koordinater: fra x=0 til x=l, halv tykkelse h. frie = [venstre ende fri, højre ende fri]
  function tegnStamme(c, l, h, frie, lys) {
    const pal = lys ? ["#dcb283", "#bd8d5d", "#8d6540"] : [TRAE.lys, TRAE.mellem, TRAE.mork];
    c.beginPath(); c.roundRect(-h * .3, -h, l + h * .6, h * 2, h * .35);
    fyldOgStreg(c, lodret(c, -h, h, ...pal));
    c.strokeStyle = "rgba(58,32,14,.5)"; c.lineWidth = .32; c.lineCap = "round";
    for (let x = 2 + h, k = 0; x < l - 2; x += 5 + hash(k + 2) * 4, k++) {  // bark
      const y = (hash(k + 11) - .5) * h * 1.3, ll = 1.6 + hash(k + 5) * 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(Math.min(l - 1, x + ll), y + .12); c.stroke();
    }
    c.strokeStyle = "rgba(255,236,200,.35)"; c.lineWidth = .4;
    c.beginPath(); c.moveTo(h * .4, -h * .62); c.lineTo(l - h * .4, -h * .62); c.stroke();
    frie.forEach((er, k) => {
      if (!er) return;
      const x = k ? l + h * .3 : -h * .3;
      c.beginPath(); c.ellipse(x, 0, h * .42, h * .98, 0, 0, 7); fyldOgStreg(c, TRAE.ende, BLYANT, .35);
      c.strokeStyle = TRAE.ring; c.lineWidth = .28;
      [.62, .3].forEach(f => { c.beginPath(); c.ellipse(x, 0, h * .42 * f, h * .98 * f, 0, 0, 7); c.stroke(); });
    });
  }

  // Jord med græskant (over) eller klippekant (under). Rører linjen verdens kant, fortsætter den ud til skærmens kant.
  function tegnJord(c, v, e, ud) {
    if (e.skjult) return; // usynlig væg
    const th = TEMA[v.tema], over = v.tema === "over", p = e.punkter.slice(), tyk = e.tyk ?? 1;
    if (e.fyld !== "ingen") {
      if (p[0][0] <= 0) p.unshift([ud.l - 5, p[0][1]]);
      if (p[p.length - 1][0] >= VB) p.push([ud.r + 5, p[p.length - 1][1]]);
    }
    c.lineJoin = c.lineCap = "round";
    const sti = (dy = 0) => { c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1] + dy) : c.moveTo(q[0], q[1] + dy)); };
    const stejl = i => Math.abs(p[i + 1][0] - p[i][0]) < Math.abs(p[i + 1][1] - p[i][1]) * .8;
    if (e.fyld === "ned" || e.fyld === "op") {
      const ned = e.fyld === "ned", r = ned ? 1 : -1, kant = ned ? ud.b + 5 : ud.t - 5;
      const ys = p.map(q => q[1]), y0 = ned ? Math.min(...ys) : Math.max(...ys);
      c.beginPath(); c.moveTo(p[0][0], kant);
      p.forEach(q => c.lineTo(q[0], q[1]));
      c.lineTo(p[p.length - 1][0], kant); c.closePath();
      c.fillStyle = lodret(c, y0, y0 + r * 75, ...th.jord); c.fill();
      c.save(); c.clip();
      // et mørkere muldlag lige under overfladen, og et par svage lag længere nede
      c.strokeStyle = over ? "rgba(84,48,20,.3)" : "rgba(0,0,0,.28)"; c.lineWidth = 8; sti(r * 4.5); c.stroke();
      c.strokeStyle = over ? "rgba(70,38,14,.13)" : "rgba(0,0,0,.16)"; c.lineWidth = .9;
      sti(r * 19); c.stroke(); sti(r * 36); c.stroke();
      // sten i jorden
      langs(p, 6.5, (x, y, k) => {
        if (x < ud.l - 3 || x > ud.r + 3 || hash(k * 3 + 1) < .25) return;
        const d = 9 + hash(k * 5 + 2) * 30, rx = .9 + hash(k + 17) * 1.5, ry = rx * (.55 + hash(k + 4) * .25), sx = x + (hash(k + 9) - .5) * 5, sy = y + r * d;
        c.fillStyle = over ? "rgba(92,56,28,.6)" : "rgba(22,12,6,.55)";
        c.beginPath(); c.ellipse(sx, sy, rx, ry, hash(k) - .5, 0, 7); c.fill();
        c.fillStyle = over ? "rgba(255,226,180,.3)" : "rgba(255,214,170,.14)";
        c.beginPath(); c.ellipse(sx - rx * .25, sy - ry * .35, rx * .5, ry * .35, -.3, 0, 7); c.fill();
      });
      c.restore();
      // kanten: mørk underside, farven, og en lys stribe øverst
      const b = tyk * 2 + 1.2;
      c.strokeStyle = th.kantM; c.lineWidth = b; sti(); c.stroke();
      c.strokeStyle = th.kant; c.lineWidth = b - .8; sti(-r * .28); c.stroke();
      c.strokeStyle = th.kant2; c.lineWidth = .8; sti(-r * tyk * .95); c.stroke();
      if (over && ned) {
        // græstotter
        const farver = [th.kantM, th.kant, th.kant2];
        c.lineWidth = .55;
        langs(p, 3.1, (x, y, k, i) => {
          if (x < ud.l - 2 || x > ud.r + 2 || hash(k + 3) < .22 || stejl(i)) return;
          for (let j = 0; j < 3; j++) {
            const h = 1.1 + hash(k * 3 + j) * 1.9, lean = (hash(k * 7 + j) - .5) * 1.6, bx = x + (j - 1) * .55;
            c.strokeStyle = farver[(k + j) % 3];
            c.beginPath(); c.moveTo(bx, y - tyk * .5); c.quadraticCurveTo(bx + lean * .2, y - tyk - h * .5, bx + (j - 1) * .5 + lean, y - tyk - .5 - h); c.stroke();
          }
        });
      } else if (!over && ned) {
        // småsten på hulens gulv
        langs(p, 8.3, (x, y, k, i) => {
          if (x < ud.l - 2 || x > ud.r + 2 || hash(k + 13) < .45 || stejl(i)) return;
          const rx = .8 + hash(k + 2) * .9;
          c.beginPath(); c.ellipse(x + (hash(k) - .5) * 3, y - tyk - .25, rx, rx * .62, 0, 0, 7);
          fyldOgStreg(c, hash(k + 8) < .5 ? "#9a8068" : "#7f6852", BLOED, .28);
        });
      }
    } else if (p.length === 2 && p[0][0] === p[1][0] && (p[0][0] <= 0 || p[0][0] >= VB)) {
      tegnKantpael(c, v, e, p);
    } else {
      // afstand fra punktet q til et linjestykke
      const afstand = (q, st) => {
        const ex = st.bx - st.ax, ey = st.by - st.ay, l2 = ex * ex + ey * ey || 1e-9;
        const t = Math.max(0, Math.min(1, ((q[0] - st.ax) * ex + (q[1] - st.ay) * ey) / l2));
        return Math.hypot(q[0] - st.ax - ex * t, q[1] - st.ay - ey * t);
      };
      // en ende er fri, hvis den ikke rører anden jord
      const fri = p.length === 2 ? p.map(q => !v.statics.some(st => !(st.ax === p[0][0] && st.ay === p[0][1] && st.bx === p[1][0] && st.by === p[1][1]) && afstand(q, st) < tyk + st.t + .8)) : [false, false];
      if (fri[0] || fri[1]) {
        // en fritstående pæl: en træstamme med bark og årringe i den frie ende
        const [[ax, ay], [bx, by]] = p;
        c.save(); c.translate(ax, ay); c.rotate(Math.atan2(by - ay, bx - ax));
        tegnStamme(c, Math.hypot(bx - ax, by - ay), tyk, fri, !over);
        c.restore();
      } else {
        // en rod/væg mellem to stykker jord
        c.strokeStyle = BLYANT; c.lineWidth = tyk * 2; sti(); c.stroke();
        c.strokeStyle = over ? TRAE.mellem : "#8d6540"; c.lineWidth = Math.max(.6, tyk * 2 - .9); c.stroke();
        c.strokeStyle = "rgba(255,236,200,.3)"; c.lineWidth = Math.max(.3, tyk * .4); c.stroke();
      }
    }
  }

  // Lodret væg ved banens kant: en tyk træpæl, så man kan se, hvad pindsvinet hopper tilbage fra.
  // Pælens inderside ligger præcis hvor væggen er i fysikken; resten af tykkelsen vokser udad, væk fra banen.
  function tegnKantpael(c, v, e, p) {
    const tyk = e.tyk ?? 1, x0 = p[0][0], ud = x0 <= 0 ? -1 : 1;
    const ind = x0 - ud * tyk, B = 4.6, midt = ind + ud * B / 2;
    const top = Math.min(p[0][1], p[1][1]), bund = Math.max(p[0][1], p[1][1]);
    c.save(); c.translate(midt, bund + 1); c.rotate(-Math.PI / 2);
    tegnStamme(c, bund - top + 1, B / 2, [false, true], v.tema === "under");
    c.restore();
  }

  // Under jorden: rødder der hænger ned fra hulens loft (fyld "op"), hele vejen ud til skærmens kanter
  function tegnRoedder(c, v, e, ud) {
    const p = e.punkter.slice();
    if (p[0][0] <= 0) p.unshift([ud.l - 5, p[0][1]]);
    if (p[p.length - 1][0] >= VB) p.push([ud.r + 5, p[p.length - 1][1]]);
    c.lineCap = "round"; c.lineJoin = "round";
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i], [bx, by] = p[i + 1];
      if (Math.abs(bx - ax) < 1) continue;
      const fra = Math.min(ax, bx), til = Math.max(ax, bx);
      for (let k = Math.ceil(fra / 7); k * 7 <= til; k++) {
        const h = hash(k + 31), x = k * 7 + (h - .5) * 3;
        if (x < fra || x > til || h < .18) continue;                // nogle steder er der ingen rod
        const y = ay + (by - ay) * (x - ax) / (bx - ax) + .6;
        const l = 5 + hash(k + 57) * 12, b = (hash(k + 83) - .5) * 5, tyk = .8 + hash(k + 11) * .9;
        const rod = () => { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + b, y + l * .55, x + b * .3, y + l); };
        const gren = l > 10 ? () => { const sy = y + l * .45, sx = x + b * .45; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 2.2, sy + 1, sx + 2.6, sy + 3.4); } : null;
        c.strokeStyle = "#2c1a0e"; c.lineWidth = tyk + .5; rod(); c.stroke();
        if (gren) { c.lineWidth = tyk * .6 + .45; gren(); c.stroke(); }
        c.strokeStyle = "#7d5534"; c.lineWidth = tyk; rod(); c.stroke();
        if (gren) { c.lineWidth = tyk * .6; gren(); c.stroke(); }
        c.strokeStyle = "rgba(255,226,180,.22)"; c.lineWidth = tyk * .3; rod(); c.stroke();
      }
    }
  }

  function tegnPlanke(c, v, e) {
    const [ax, ay] = e.fra, [bx, by] = e.til, l = Math.hypot(bx - ax, by - ay), h = 1.8, lys = v.tema === "under";
    c.save(); c.translate(ax, ay); c.rotate(Math.atan2(by - ay, bx - ax)); c.lineCap = "round";
    c.beginPath(); c.roundRect(-1, -h, l + 2, h * 2, .8);
    fyldOgStreg(c, lodret(c, -h, h, lys ? "#e0b88a" : "#d9a871", lys ? "#bd8d5d" : "#b27c49", lys ? "#94683f" : "#8a5c33"));
    // årer i træet, et lyst skær øverst og et søm i hver ende
    c.strokeStyle = "rgba(74,44,20,.38)"; c.lineWidth = .28;
    for (let x = 1.5, k = 0; x < l - 3; x += 6 + hash(k + 4) * 5, k++) {
      const y = (hash(k + 21) - .5) * 1.9, ll = Math.min(l - x - .5, 3 + hash(k + 7) * 5);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + ll / 2, y + .35, x + ll, y); c.stroke();
    }
    c.strokeStyle = "rgba(255,240,210,.5)"; c.lineWidth = .45;
    c.beginPath(); c.moveTo(-.2, -h + .75); c.lineTo(l + .2, -h + .75); c.stroke();
    [.6, l - .6].forEach(x => {
      c.fillStyle = "#5a4636"; c.beginPath(); c.arc(x, 0, .55, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(x - .15, -.15, .2, 0, 7); c.fill();
    });
    c.restore();
  }

  /* ---------- Ting på banen ---------- */
  function tegnTrampolin(c, v, e, t) {
    const [ax, ay] = e.fra, [bx, by] = e.til, mx = (ax + bx) / 2, my = (ay + by) / 2;
    const ang = Math.atan2(by - ay, bx - ax), l = Math.hypot(bx - ax, by - ay);
    const bump = e._puls ? Math.max(0, 1 - (t - e._puls) * 4) : 0;
    c.lineCap = c.lineJoin = "round";
    if (v.tema === "over") {
      // to træben ned til jorden
      [[ax + (bx - ax) * .14, ay + (by - ay) * .14], [ax + (bx - ax) * .86, ay + (by - ay) * .86]].forEach(([x, y]) => {
        c.beginPath(); c.roundRect(x - .9, y, 1.8, paaJord(v, x, y) + 2 - y, .4); fyldOgStreg(c, lodret(c, y, y + 14, TRAE.mellem, TRAE.mork));
      });
      c.save(); c.translate(mx, my); c.rotate(ang);
      // fjedre under dugen
      c.strokeStyle = "#8d8f96"; c.lineWidth = .4;
      [-.3, 0, .3].forEach(f => { c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(f * l + (k % 2 ? .7 : -.7), 1.2 + bump + k * .35); c.stroke(); });
      // rød dug med hvide striber
      const pude = () => { c.beginPath(); c.roundRect(-l / 2 - .6, -1.6 + bump, l + 1.2, 3.2, 1.6); };
      pude(); c.fillStyle = lodret(c, -1.6 + bump, 1.6 + bump, "#ff8a7a", "#f2545b", "#cf3a48"); c.fill();
      c.save(); pude(); c.clip();
      c.fillStyle = "rgba(255,255,255,.92)";
      for (let i = 0; i < 4; i++) { const x = -l / 2 + (i * 2 + .55) * l / 8; c.beginPath(); c.moveTo(x, -2 + bump); c.lineTo(x + l / 8, -2 + bump); c.lineTo(x + l / 8 - .9, 2 + bump); c.lineTo(x - .9, 2 + bump); c.fill(); }
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-l / 2, -1.6 + bump, l, .8);
      c.restore();
      pude(); c.strokeStyle = "#8f2433"; c.lineWidth = STREG; c.stroke();
      c.restore();
    } else {
      // stor lysende svampehat på en stilk
      gloed(c, mx, my - 1, l * .75, "200,130,255", .28);
      c.beginPath(); c.roundRect(mx - 1.7, my, 3.4, paaJord(v, mx, my) + 2 - my, 1.2);
      fyldOgStreg(c, lodret(c, my, my + 12, "#f6ead8", "#cdb89c"), "#6e5a44");
      c.save(); c.translate(mx, my); c.rotate(ang);
      c.beginPath(); c.ellipse(0, 1 + bump, l / 2 + 1, 5 - bump, 0, Math.PI, 0); c.closePath();
      fyldOgStreg(c, lodret(c, -4, 1.5, "#e3a6ff", "#a561e0", "#7a3fba"), "#4a2378");
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = .5;
      c.beginPath(); c.ellipse(0, 1 + bump, l / 2 - .4, 4.2 - bump, 0, Math.PI * 1.12, Math.PI * 1.45); c.stroke();
      [[-.27, -2.3, 1], [.08, -3.3, 1.15], [.32, -1.7, .8], [-.08, -1.2, .6]].forEach(([x, y, r]) => { c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(x * l, y + bump, r, r * .75, 0, 0, 7); c.fill(); });
      c.restore();
    }
  }

  function tegnHule(c, v, h, t) {
    const hjemme = v.status === "hjemme";
    c.lineCap = c.lineJoin = "round";
    if (v.tema === "over") {
      // en jordhøj med græs på toppen og en indgang med dørkarm af træ.
      // Højen og indgangen fortsætter ned til jorden; jorden tegnes bagefter og dækker resten
      const th = TEMA.over, cx = h.x, cy = h.y + 4, rx = h.r + 6, ry = h.r + 3, ix = h.r - 1, iy = h.r - 2;
      const bund = Math.max(paaJord(v, cx - rx, h.y), paaJord(v, cx, h.y), paaJord(v, cx + rx, h.y)) + 4;
      c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); c.lineTo(cx + rx, bund); c.lineTo(cx - rx, bund); c.closePath();
      fyldOgStreg(c, kugle(c, cx, cy - ry * .2, rx * 1.25, "#c8925f", "#7d4f2c"));
      // græs hen over toppen
      const bue = (d, a0 = 1.14, a1 = 1.86) => { c.beginPath(); c.ellipse(cx, cy, rx - d, ry - d, 0, Math.PI * a0, Math.PI * a1); };
      c.strokeStyle = th.kantM; c.lineWidth = 2.6; bue(.3); c.stroke();
      c.strokeStyle = th.kant; c.lineWidth = 1.8; bue(.1); c.stroke();
      c.strokeStyle = th.kant2; c.lineWidth = .6; bue(-.45, 1.2, 1.8); c.stroke();
      c.lineWidth = .55;
      for (let i = -5; i <= 5; i++) {
        const a = -Math.PI / 2 + i * .2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, hh = 1.6 + hash(i + 20) * 1.8;
        c.strokeStyle = [th.kantM, th.kant, th.kant2][(i + 6) % 3];
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + i * .08, y - hh * .6, x + i * .22, y - hh); c.stroke();
      }
      // indgangen: mørk, eller varmt oplyst når pindsvinet er hjemme
      const inde = c.createRadialGradient(cx, cy + 1, .5, cx, cy, ix * 1.3);
      if (hjemme) { inde.addColorStop(0, "#fff6da"); inde.addColorStop(1, "#f0b25c"); } else { inde.addColorStop(0, "#150b05"); inde.addColorStop(1, "#3d2515"); }
      c.beginPath(); c.ellipse(cx, cy, ix, iy, 0, Math.PI, 0); c.lineTo(cx + ix, bund); c.lineTo(cx - ix, bund); c.closePath();
      c.fillStyle = inde; c.fill();
      const karm = () => { c.beginPath(); c.moveTo(cx - ix, bund); c.lineTo(cx - ix, cy); c.ellipse(cx, cy, ix, iy, 0, Math.PI, 0); c.lineTo(cx + ix, bund); };
      karm(); c.strokeStyle = BLYANT; c.lineWidth = 1.9; c.stroke();
      karm(); c.strokeStyle = TRAE.lys; c.lineWidth = 1.05; c.stroke();
      karm(); c.strokeStyle = "rgba(255,240,210,.45)"; c.lineWidth = .3; c.stroke();
      if (hjemme) gloed(c, cx, cy, rx * 1.3, "255,214,130", .3);
    } else {
      // rund hobbit-dør af træplanker i en ring af sten, med et lille oplyst vindue og et dørhåndtag.
      // Når pindsvinet er hjemme, står døren åben, og der er lys derinde.
      const glo = .75 + (RM.matches ? 0 : Math.sin(t * 2) * .1), r = h.r;
      gloed(c, h.x, h.y, r + 15, "255,200,120", .38 * glo);
      // dørkarmen fortsætter ned til jorden
      const bund = paaJord(v, h.x, h.y) + 3;
      c.fillStyle = "#3d2717"; c.fillRect(h.x - r - 1.5, h.y, 2 * r + 3, bund - h.y);
      // stenene i ringen
      c.beginPath(); c.arc(h.x, h.y, r + 2.5, 0, 7); fyldOgStreg(c, "#4a3b32", "#1e120a");
      for (let i = 0; i < 14; i++) {
        const a0 = i / 14 * Math.PI * 2 + .03, a1 = a0 + Math.PI * 2 / 14 - .07;
        c.fillStyle = ["#a59383", "#8c7b6c", "#b3a292"][i % 3];
        c.beginPath(); c.arc(h.x, h.y, r + 2.15, a0, a1); c.arc(h.x, h.y, r + .4, a1, a0, true); c.closePath(); c.fill();
        c.fillStyle = "rgba(255,255,255,.16)";
        c.beginPath(); c.arc(h.x, h.y, r + 2.1, a0 + .05, a1 - .12); c.arc(h.x, h.y, r + 1.5, a1 - .12, a0 + .05, true); c.closePath(); c.fill();
      }
      if (hjemme) {
        // varmt lys inde i hulen, og døren svinget op mod venstre
        const ind = c.createRadialGradient(h.x, h.y + 1, 1, h.x, h.y, r);
        ind.addColorStop(0, "#fff6da"); ind.addColorStop(1, "#f0b25c");
        c.fillStyle = ind; c.beginPath(); c.arc(h.x, h.y, r, 0, 7); c.fill();
        c.beginPath(); c.ellipse(h.x - r * .92, h.y, r * .28, r * .98, 0, 0, 7); fyldOgStreg(c, lodret(c, h.y - r, h.y + r, "#c98a50", "#8f5428"), BLYANT, .4);
      } else {
        c.save(); c.beginPath(); c.arc(h.x, h.y, r, 0, 7); c.clip();
        c.fillStyle = lodret(c, h.y - r, h.y + r, "#d39558", "#b0733c", "#86501f"); c.fillRect(h.x - r, h.y - r, 2 * r, 2 * r);
        // planker
        c.strokeStyle = "rgba(74,40,14,.7)"; c.lineWidth = .35;
        for (let k = -2; k <= 2; k++) { const x = h.x + k * r * .38; c.beginPath(); c.moveTo(x, h.y - r); c.lineTo(x, h.y + r); c.stroke(); }
        // jernbeslag
        c.strokeStyle = "#4b3a30"; c.lineWidth = .7;
        [-.55, .55].forEach(f => { c.beginPath(); c.moveTo(h.x - r, h.y + r * f); c.lineTo(h.x - r * .1, h.y + r * f); c.stroke(); });
        c.restore();
        c.beginPath(); c.arc(h.x, h.y, r, 0, 7); c.strokeStyle = BLYANT; c.lineWidth = .4; c.stroke();
        // vindue med krydspost og varmt lys
        const vy = h.y - r * .42, vr = r * .27;
        c.beginPath(); c.arc(h.x, vy, vr, 0, 7); fyldOgStreg(c, `rgba(255,220,150,${glo})`, "#4a2a12", .6);
        c.strokeStyle = "#4a2a12"; c.lineWidth = .4;
        c.beginPath(); c.moveTo(h.x - vr, vy); c.lineTo(h.x + vr, vy); c.moveTo(h.x, vy - vr); c.lineTo(h.x, vy + vr); c.stroke();
        // dørhåndtag
        c.beginPath(); c.arc(h.x + r * .58, h.y + r * .12, r * .1 + .35, 0, 7); fyldOgStreg(c, kugle(c, h.x + r * .58, h.y + r * .12, r * .1 + .35, "#fff0a0", "#e0a520"), "#7a5510", .3);
      }
    }
  }

  // Æblets omrids omkring (0, 0); r er cirka den halve bredde
  function aebleSti(c, r) {
    c.beginPath(); c.moveTo(0, -r * .62);
    c.bezierCurveTo(r * .75, -r * 1.3, r * 1.75, -r * .35, r * 1.08, r * .7);
    c.bezierCurveTo(r * .7, r * 1.3, r * .25, r * 1.08, 0, r * .92);
    c.bezierCurveTo(-r * .25, r * 1.08, -r * .7, r * 1.3, -r * 1.08, r * .7);
    c.bezierCurveTo(-r * 1.75, -r * .35, -r * .75, -r * 1.3, 0, -r * .62);
    c.closePath();
  }
  function tegnAeble(c, a, t, i) {
    if (a.taget) return;
    const y = a.y + (RM.matches ? 0 : Math.sin(t * 2.4 + i) * .8), r = 2.75;
    c.save(); c.translate(a.x, y + .3); c.lineCap = c.lineJoin = "round";
    if (!a.ikon) gloed(c, 0, 0, 7.5, "255,244,200", .32);
    aebleSti(c, r); fyldOgStreg(c, kugle(c, 0, 0, r * 1.5, "#ff8a6e", "#cf2a30"), "#7d1620");
    c.fillStyle = "rgba(120,10,25,.25)"; c.beginPath(); c.ellipse(0, -r * .62, r * .42, r * .16, 0, 0, 7); c.fill(); // fordybningen ved stilken
    glimt(c, -r * .55, -r * .3, r * .26, r * .45, .5, .7);
    c.strokeStyle = "#5a3418"; c.lineWidth = .65; c.beginPath(); c.moveTo(0, -r * .6); c.quadraticCurveTo(.1, -r * 1.1, .7, -r * 1.42); c.stroke();
    c.beginPath(); c.moveTo(.3, -r * 1.05); c.quadraticCurveTo(1.4, -r * 1.9, 3.3, -r * 1.35); c.quadraticCurveTo(1.9, -r * .85, .3, -r * 1.05);
    fyldOgStreg(c, lodret(c, -r * 1.8, -r * .9, "#9ade74", "#4f9e3c"), "#2f6b2c", .35);
    // et lille blink en gang imellem
    if (!RM.matches) {
      const b = Math.max(0, Math.sin(t * 1.7 + i * 2.1) - .86) / .14;
      if (b > 0) { c.fillStyle = `rgba(255,255,255,${b})`; c.beginPath(); for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2; c.lineTo(2.3 + Math.cos(an) * 1.5 * b, -2.2 + Math.sin(an) * 1.5 * b); c.lineTo(2.3 + Math.cos(an + .785) * .35, -2.2 + Math.sin(an + .785) * .35); } c.fill(); }
    }
    c.restore();
  }

  // Hænger snoren fra loftet (en knage), eller fra en ballon på himlen?
  function snorBallon(v, r) {
    if (r.ballon == null) {
      const a = r.anker;
      r.ballon = !v.statics.some(st => {
        if (st.slags !== "jord" || Math.min(st.ax, st.bx) > a.x + 2 || Math.max(st.ax, st.bx) < a.x - 2) return false;
        const yy = Math.abs(st.bx - st.ax) < .5 ? Math.min(st.ay, st.by) : st.ay + (st.by - st.ay) * (a.x - st.ax) / (st.bx - st.ax);
        return yy <= a.y + 1 && yy >= a.y - 4;
      });
    }
    return r.ballon;
  }
  const BALLONFARVER = [["#ff8a94", "#e8384f", "#8f1830"], ["#ffe07a", "#f2a81e", "#96600a"], ["#96d4ff", "#3b8fe0", "#1c4f8f"]];
  // Er snoren klippet, flyver ballonen op og væk og tager det stykke snor med, der stadig hænger i den
  function ballonerFlyver(v, dt, t) {
    v.ropes.forEach(r => {
      if (!snorBallon(v, r) || r.led.every(l => l.on) || r.anker.y < ud.t - 40) return;
      const dx = RM.matches ? 0 : Math.sin(t * 1.3 + r.anker.x) * 4 * dt, dy = -24 * dt;
      const flyt = [r.anker];
      for (const l of r.led) { if (!l.on) break; flyt.push(l.b); }
      flyt.forEach(p => { p.x += dx; p.y += dy; p.px += dx; p.py += dy; });
    });
  }
  function tegnBallon(c, v, r, i, t) {
    const a = r.anker, [lys, farve, mork] = BALLONFARVER[i % BALLONFARVER.length];
    const sving = RM.matches ? 0 : Math.sin(t * 1.4 + i * 2) * .07;
    c.save(); c.translate(a.x, a.y); c.rotate(sving);
    c.strokeStyle = "rgba(90,60,40,.85)"; c.lineWidth = .35;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(.8, -1, 0, -2.2); c.stroke();
    c.beginPath(); c.moveTo(0, -2.5); c.lineTo(1, -1.4); c.lineTo(-1, -1.4); c.closePath(); fyldOgStreg(c, farve, mork, .35);
    // let dråbeformet ballon
    c.beginPath(); c.moveTo(0, -2.3);
    c.bezierCurveTo(-5.6, -5.2, -4.9, -12, 0, -12); c.bezierCurveTo(4.9, -12, 5.6, -5.2, 0, -2.3); c.closePath();
    fyldOgStreg(c, kugle(c, 0, -7.4, 5.4, lys, farve), mork);
    glimt(c, -1.7, -9.2, .9, 1.7, .45, .75);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = .4; c.beginPath(); c.arc(0, -7.2, 3.6, .25, 1.1); c.stroke();
    c.restore();
  }

  function tegnSnor(c, r, v, i, t) {
    c.lineCap = c.lineJoin = "round";
    if (snorBallon(v, r)) tegnBallon(c, v, r, i, t);
    else {
      // knagen i loftet: en lille jernring på en træklods
      const a = r.anker;
      c.beginPath(); c.roundRect(a.x - 2.2, a.y - 1.6, 4.4, 2.2, .6); fyldOgStreg(c, lodret(c, a.y - 1.6, a.y + .6, "#c99a66", "#8d6540"), "#1e120a", .4);
      c.beginPath(); c.arc(a.x, a.y + 1, 1.1, 0, 7); c.strokeStyle = "#1e120a"; c.lineWidth = 1; c.stroke();
      c.strokeStyle = "#b9bcc4"; c.lineWidth = .5; c.stroke();
    }
    // snoren tegnes i de stykker, der stadig hænger sammen: mørk kant, lyst reb og snoninger
    const stykker = []; let cur = null;
    r.led.forEach(l => { if (l.on) { if (!cur) { cur = [l.a]; stykker.push(cur); } cur.push(l.b); } else cur = null; });
    stykker.forEach(s => {
      c.beginPath(); s.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
      c.strokeStyle = "#5e3d1f"; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = "#e8c690"; c.lineWidth = .95; c.stroke();
      c.strokeStyle = "#b98a55"; c.lineWidth = .95; c.lineCap = "butt"; c.setLineDash([.45, 1.25]); c.stroke(); c.setLineDash([]); c.lineCap = "round";
    });
  }

  function tegnSlynge(c, v, s) {
    const fod = paaJord(v, s.x, s.y + 1) + 3;
    c.lineCap = c.lineJoin = "round";
    if (v.tema === "over") {
      // et stort blad på en stilk
      const stilk = () => { c.beginPath(); c.moveTo(s.x, s.y + 1); c.quadraticCurveTo(s.x - 3, (s.y + fod) / 2, s.x + 1, fod); };
      stilk(); c.strokeStyle = "#255c26"; c.lineWidth = 2; c.stroke();
      stilk(); c.strokeStyle = "#4f9e3c"; c.lineWidth = 1.2; c.stroke();
      c.save(); c.translate(s.x - 2.4, (s.y + fod) / 2 + 1); c.rotate(-.6);
      c.beginPath(); c.moveTo(-2.8, 0); c.quadraticCurveTo(0, -1.5, 2.8, 0); c.quadraticCurveTo(0, 1.5, -2.8, 0); fyldOgStreg(c, "#7ccb5a", "#255c26", .35);
      c.restore();
      c.save(); c.translate(s.x, s.y + .5);
      c.beginPath(); c.moveTo(-9, 0); c.bezierCurveTo(-5, -2.2, 5, -2.2, 9, -.2); c.bezierCurveTo(5, 3.6, -5, 3.6, -9, 0); c.closePath();
      fyldOgStreg(c, lodret(c, -1.6, 2.8, "#93da6c", "#5cb043", "#3d8a31"), "#255c26");
      c.strokeStyle = "rgba(37,92,38,.7)"; c.lineWidth = .4;
      c.beginPath(); c.moveTo(-8.2, .1); c.quadraticCurveTo(0, .9, 8.2, 0); c.stroke();
      c.lineWidth = .28;
      [-5, -2, 1, 4].forEach(x => { c.beginPath(); c.moveTo(x, .5); c.lineTo(x + 1.5, -.9); c.moveTo(x, .5); c.lineTo(x + 1.5, 1.9); c.stroke(); });
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = .4; c.beginPath(); c.moveTo(-6, -.8); c.quadraticCurveTo(-1, -1.5, 4, -1.2); c.stroke();
      c.restore();
    } else {
      // en orange svampehat på en stilk
      gloed(c, s.x, s.y, 13, "255,180,90", .25);
      c.beginPath(); c.roundRect(s.x - 1.9, s.y, 3.8, fod - s.y, 1.4); fyldOgStreg(c, lodret(c, s.y, s.y + 12, "#f6ead8", "#cdb89c"), "#6e5a44");
      c.beginPath(); c.ellipse(s.x, s.y + 1, 8.4, 3.1, 0, Math.PI, 0); c.closePath();
      fyldOgStreg(c, lodret(c, s.y - 2.2, s.y + 1, "#ffd27a", "#ff9f3c", "#e07a1e"), "#8a4208");
      [[-4.4, -.3, .9], [-1, -1.2, 1.1], [3, -.7, .9], [5.8, .1, .6]].forEach(([x, y, r]) => { c.fillStyle = "rgba(255,250,235,.85)"; c.beginPath(); c.ellipse(s.x + x, s.y + y, r, r * .6, 0, 0, 7); c.fill(); });
    }
  }

  // En krans af pigge: n pigge fra vinklen a0 med da imellem; fra en indre ellipse (rx, ry) ud til en ydre (RX, RY)
  function pigge(c, n, a0, da, rx, ry, RX, RY, farve, spring) {
    c.fillStyle = farve; c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = a0 + i * da;
      if (spring && spring(a)) continue;
      c.moveTo(Math.cos(a - da * .52) * rx, Math.sin(a - da * .52) * ry);
      c.lineTo(Math.cos(a) * RX, Math.sin(a) * RY);
      c.lineTo(Math.cos(a + da * .52) * rx, Math.sin(a + da * .52) * ry);
    }
    c.fill();
  }
  // Ansigtets små dele (fælles for det sammenrullede og det glade pindsvin)
  function pindsvinAnsigt(c, x, y, k, glad) {
    // øre
    c.beginPath(); c.arc(x - 1.9 * k, y - 2.5 * k, .95 * k, 0, 7); fyldOgStreg(c, "#b57d4b", BLYANT, .3);
    c.fillStyle = "#f2a9a0"; c.beginPath(); c.arc(x - 1.85 * k, y - 2.45 * k, .45 * k, 0, 7); c.fill();
    // kind, øje, snude og smil
    c.fillStyle = "rgba(255,130,140,.5)"; c.beginPath(); c.ellipse(x + .5 * k, y + 1 * k, .8 * k, .55 * k, 0, 0, 7); c.fill();
    c.lineCap = "round";
    if (glad) { c.strokeStyle = "#2b1a0e"; c.lineWidth = .45 * k; c.beginPath(); c.arc(x - .1 * k, y - .7 * k, .7 * k, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else {
      c.fillStyle = "#2b1a0e"; c.beginPath(); c.arc(x - .1 * k, y - 1 * k, .68 * k, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x + .12 * k, y - 1.22 * k, .24 * k, 0, 7); c.fill();
    }
    c.fillStyle = "#2b1a0e"; c.beginPath(); c.arc(x + 2.45 * k, y - .1 * k, .8 * k, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(x + 2.25 * k, y - .35 * k, .22 * k, 0, 7); c.fill();
    c.strokeStyle = "#7a4a2a"; c.lineWidth = .35 * k;
    c.beginPath(); c.arc(x + 1.2 * k, y + .35 * k, .95 * k, .25, glad ? 2.2 : 1.7); c.stroke();
  }
  // Pindsvinet: sammenrullet kugle med pigge og et lille ansigt, eller udrullet og glad (når det er hjemme)
  function tegnPindsvin(c, b, t, hjemme) {
    c.save(); c.translate(b.x, b.y); c.lineJoin = c.lineCap = "round";
    if (hjemme != null) {
      const hop = Math.abs(Math.sin(hjemme * 7)) * 3 * Math.min(1, hjemme * 2);
      c.translate(0, -hop);
      [[-2.6, 4.3], [2.4, 4.3]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 1.5, 1, 0, 0, 7); fyldOgStreg(c, "#8f5f38", BLYANT, .35); });
      pigge(c, 11, Math.PI + .02, .29, 5, 3.7, 8.6, 6.9, "#4a2f1a");
      pigge(c, 10, Math.PI + .165, .29, 5, 3.7, 7.6, 6, "#80562f");
      c.beginPath(); c.ellipse(0, 0, 6, 4.4, 0, 0, 7); fyldOgStreg(c, kugle(c, 0, 0, 6, "#cf9a66", "#8c5c36"));
      c.strokeStyle = "rgba(74,47,26,.5)"; c.lineWidth = .35;
      [[-3.6, -1.4], [-1.8, -2.6], [-4, .8], [-2, -.4], [-.2, -1.8], [-2.6, 1.8]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x - .7, y - .65); c.stroke(); });
      c.beginPath(); c.ellipse(4.2, .6, 3.5, 2.9, 0, 0, 7); fyldOgStreg(c, lodret(c, -2.3, 3.5, "#fdecd2", "#ecc9a0"), "#8a6238", .35);
      pindsvinAnsigt(c, 4.9, .5, 1.05, true);
      c.restore(); return;
    }
    c.rotate(b.rot);
    // pigge i to lag: mørke og lange bagest, lysere og kortere forrest
    const ansigt = a => { const x = Math.cos(a), y = Math.sin(a); return x > .5 && y > -.6 && y < .68; };
    pigge(c, 18, 0, Math.PI / 9, 4.2, 4.2, 6.7, 6.7, "#4a2f1a", ansigt);
    pigge(c, 18, Math.PI / 18, Math.PI / 9, 4.2, 4.2, 5.9, 5.9, "#80562f", ansigt);
    c.beginPath(); c.arc(0, 0, 4.7, 0, 7); fyldOgStreg(c, kugle(c, 0, 0, 4.7, "#cf9a66", "#8c5c36"));
    // små pigge-streger på ryggen
    c.strokeStyle = "rgba(74,47,26,.5)"; c.lineWidth = .35;
    [[-2.7, -1.5], [-1.1, -3], [-3.2, .7], [-1.4, -.7], [-2.2, 2.3], [-.5, 1.6], [.5, -2.3], [-.2, 3.3]].forEach(([x, y]) => {
      const l = Math.hypot(x, y) || 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + x / l * .85, y + y / l * .85); c.stroke();
    });
    c.beginPath(); c.ellipse(3, .3, 2.7, 2.4, 0, 0, 7); fyldOgStreg(c, lodret(c, -2.1, 2.7, "#fdecd2", "#ecc9a0"), "#8a6238", .35);
    pindsvinAnsigt(c, 2.95, .3, .95, false);
    c.restore();
  }

  /* ---------- Pynt ---------- */
  function tegnPynt(c, v, p0, t, i) {
    const p = p0.type === "sol" || p0.fri ? p0 : Object.assign({}, p0, { y: paaJord(v, p0.x, p0.y - 8, 24) + .6 });
    const ro = RM.matches, vugge = ro ? 0 : Math.sin(t * 1.5 + i) * .08;
    c.lineCap = c.lineJoin = "round";
    if (p.type === "svamp") {
      const s = p.s ?? 1;
      gloed(c, p.x, p.y - 3 * s, 12 * s, "120,230,255", .4);
      c.save(); c.translate(p.x, p.y); c.rotate(vugge); c.scale(s, s);
      c.beginPath(); c.roundRect(-.9, -4.2, 1.8, 4.6, .6); fyldOgStreg(c, lodret(c, -4, 0, "#f6f1e6", "#c9c0ae"), "#5c6a70", .35);
      c.beginPath(); c.ellipse(0, -4, 3.6, 2.5, 0, Math.PI, 0); c.closePath(); fyldOgStreg(c, lodret(c, -6.5, -4, "#c6f6ff", "#59cbee"), "#1f7ea3", .4);
      [[-1.6, -4.9, .5], [.3, -5.6, .6], [1.9, -4.7, .4]].forEach(([x, y, r]) => { c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
      c.restore();
    } else if (p.type === "blomst") {
      const f = p.farve || "#ff7fbf";
      c.save(); c.translate(p.x, p.y); c.rotate(vugge);
      c.strokeStyle = "#255c26"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, .4); c.quadraticCurveTo(.5, -2.6, 0, -5.4); c.stroke();
      c.strokeStyle = "#4f9e3c"; c.lineWidth = .5; c.stroke();
      c.beginPath(); c.moveTo(.2, -1.6); c.quadraticCurveTo(1.6, -3.2, 2.6, -2.2); c.quadraticCurveTo(1.6, -1.2, .2, -1.6); fyldOgStreg(c, "#7ccb5a", "#255c26", .3);
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 - Math.PI / 2;
        c.beginPath(); c.ellipse(Math.cos(a) * 1.45, -5.6 + Math.sin(a) * 1.45, 1.3, 1, a, 0, 7); fyldOgStreg(c, f, BLOED, .3);
        c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(Math.cos(a) * 1.7, -5.6 + Math.sin(a) * 1.7, .55, .32, a, 0, 7); c.fill();
      }
      c.beginPath(); c.arc(0, -5.6, .95, 0, 7); fyldOgStreg(c, kugle(c, 0, -5.6, .95, "#fff0a0", "#f2b21e"), "#8a5a0a", .3);
      c.restore();
    } else if (p.type === "trae") {
      // stamme med rodfod, og en krone af bløde klumper
      c.beginPath(); c.moveTo(p.x - 2.6, p.y + .5); c.quadraticCurveTo(p.x - 1.5, p.y - 3, p.x - 1.5, p.y - 15); c.lineTo(p.x + 1.5, p.y - 15); c.quadraticCurveTo(p.x + 1.5, p.y - 3, p.x + 2.6, p.y + .5); c.closePath();
      fyldOgStreg(c, lodret(c, p.y - 15, p.y, TRAE.mork, TRAE.mellem));
      c.strokeStyle = "rgba(58,32,14,.5)"; c.lineWidth = .3;
      [[-.5, -4, 3], [.6, -8, 2.4], [-.3, -11.5, 2]].forEach(([x, y, l]) => { c.beginPath(); c.moveTo(p.x + x, p.y + y); c.lineTo(p.x + x + .1, p.y + y - l); c.stroke(); });
      const kr = [[0, -19.5, 7.6], [-5.6, -16.5, 5], [5.6, -16.5, 5], [-3.4, -23, 5.2], [3.6, -23.2, 5]];
      c.save(); c.translate(p.x, p.y); c.rotate(vugge * .25);
      const krone = (dx, dy, k) => { c.beginPath(); kr.forEach(([x, y, r]) => { c.moveTo(x + dx + r * k, y + dy); c.arc(x + dx, y + dy, r * k, 0, 7); }); };
      krone(0, 0, 1); c.strokeStyle = "#255c26"; c.lineWidth = STREG * 2; c.stroke();
      c.fillStyle = lodret(c, -29, -11, "#7ccb5a", "#3f9136"); c.fill();
      krone(-1.1, -1.2, .62); c.fillStyle = "rgba(170,230,120,.55)"; c.fill();
      c.fillStyle = "rgba(37,92,38,.28)";
      [[2.2, -14.6, 2], [-4.6, -13.6, 1.6], [5.6, -19.2, 1.5]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
      c.restore();
    } else if (p.type === "busk") {
      const kr = [[-5.4, -3.6, 3.8], [0, -5.2, 5.2], [5.4, -3.4, 3.6]];
      const krone = (dx, dy, k) => { c.beginPath(); kr.forEach(([x, y, r]) => { c.moveTo(p.x + x + dx + r * k, p.y + y + dy); c.arc(p.x + x + dx, p.y + y + dy, r * k, 0, 7); }); c.rect(p.x - 6, p.y - 3.6, 12, 4); };
      krone(0, 0, 1); c.strokeStyle = "#255c26"; c.lineWidth = STREG * 2; c.stroke();
      c.fillStyle = lodret(c, p.y - 10, p.y, "#7ccb5a", "#3f9136"); c.fill();
      c.beginPath(); kr.forEach(([x, y, r]) => { c.moveTo(p.x + x - .6 + r * .55, p.y + y - .9); c.arc(p.x + x - .6, p.y + y - .9, r * .55, 0, 7); }); c.fillStyle = "rgba(170,230,120,.5)"; c.fill();
    } else if (p.type === "sol") {
      // sol med glød og stråler, der drejer langsomt
      gloed(c, p.x, p.y, 22, "255,236,150", .55);
      c.save(); c.translate(p.x, p.y); c.rotate(ro ? 0 : t * .12);
      c.fillStyle = "rgba(255,214,90,.75)"; c.beginPath();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, l = k % 2 ? 12.4 : 14.2; c.moveTo(Math.cos(a - .12) * 8, Math.sin(a - .12) * 8); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + .12) * 8, Math.sin(a + .12) * 8); }
      c.fill(); c.restore();
      c.beginPath(); c.arc(p.x, p.y, 8.4, 0, 7); fyldOgStreg(c, kugle(c, p.x, p.y, 8.4, "#fff3a8", "#ffc93c"), "#e09a1a");
      glimt(c, p.x - 3, p.y - 3.4, 1.6, 2.6, .7, .45);
    } else if (p.type === "krystal") {
      // en lille klynge lysende krystaller
      const f = p.farve || "#b48cf0";
      gloed(c, p.x, p.y - 3.5, 11, "200,170,255", .3);
      const sten = (x, h, b, rot) => {
        c.save(); c.translate(p.x + x, p.y + .4); c.rotate(rot);
        c.beginPath(); c.moveTo(0, -h); c.lineTo(b, -h * .68); c.lineTo(b * .85, 0); c.lineTo(-b * .85, 0); c.lineTo(-b, -h * .68); c.closePath();
        fyldOgStreg(c, f, BLOED, .35);
        c.fillStyle = "rgba(255,255,255,.42)"; c.beginPath(); c.moveTo(0, -h); c.lineTo(-b, -h * .68); c.lineTo(-b * .85, 0); c.lineTo(-b * .1, 0); c.closePath(); c.fill();
        c.fillStyle = "rgba(30,10,60,.22)"; c.beginPath(); c.moveTo(0, -h); c.lineTo(b, -h * .68); c.lineTo(b * .85, 0); c.lineTo(b * .25, 0); c.closePath(); c.fill();
        c.restore();
      };
      sten(-2.6, 4.2, 1.2, -.42); sten(2.5, 3.6, 1.1, .45); sten(0, 7, 1.9, 0);
      if (!ro) { const b = Math.max(0, Math.sin(t * 2 + i * 1.7)) * .7; c.fillStyle = `rgba(255,255,255,${b})`; c.beginPath(); c.arc(p.x - .7, p.y - 4.8, .5, 0, 7); c.fill(); }
    }
  }

  // Ildfluer under jorden (rene pynt-lys, der bevæger sig blidt rundt)
  function ildfluer(t, ud) {
    return Array.from({ length: 10 }, (_, i) => ({
      x: ud.l + (ud.r - ud.l) * hash(i + 1) + (RM.matches ? 0 : Math.sin(t * .6 + i) * 6),
      y: ud.t + (ud.b - ud.t) * (.15 + .7 * hash(i + 20)) + (RM.matches ? 0 : Math.cos(t * .5 + i * 2) * 4),
    }));
  }

  // Støvskyer, når pindsvinet lander eller støder på noget
  let stoev = [];
  function stoevPuf(x, y, under) {
    if (RM.matches) return;
    for (let k = 0; k < 5; k++) stoev.push({ x, y: y + 3.5, vx: (k - 2) * 5 + (Math.random() - .5) * 4, vy: -4 - Math.random() * 5, r: 1 + Math.random() * 1.2, liv: 1, under });
    if (stoev.length > 40) stoev.splice(0, stoev.length - 40);
  }
  function tegnStoev(c, dt) {
    stoev = stoev.filter(p => (p.liv -= dt * 2.2) > 0);
    stoev.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94;
      c.fillStyle = p.under ? `rgba(230,205,175,${p.liv * .45})` : `rgba(255,250,235,${p.liv * .7})`;
      c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - p.liv * .6), 0, 7); c.fill();
    });
  }

  /* =====================================================================
     Selve spillet
     ===================================================================== */
  Spil.css("css-rullebanen", `
    .rb{position:relative;height:100%;overflow:hidden;overflow:clip;background:#21170f;touch-action:none}
    .rb-c{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    .rb-knapper{position:absolute;z-index:5;top:calc(2vh + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));display:flex;gap:12px}
    .rb-knap{width:clamp(56px,8.5vh,76px);aspect-ratio:1;border-radius:50%;background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.3);font-size:clamp(26px,4.2vh,38px)}
    .rb-knap:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(31,58,95,.3)}
    /* Banekortet: himmel foroven, jord forneden; banerne som bobler langs en sti */
    .rb-kort{position:absolute;inset:0;z-index:8;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y}
    .rb-kort-in{position:relative;min-height:100%;margin:0 auto;max-width:620px}
    .rb-sti{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .rb-kort-pynt{position:absolute;left:0;top:0;width:100%;overflow:hidden;pointer-events:none}
    .rb-kort-pynt svg,.rb-kort-pynt img{position:absolute;overflow:visible}
    .rb-boble{position:absolute;transform:translate(-50%,-50%);width:clamp(76px,11vh,100px);aspect-ratio:1;border-radius:50%;
      display:grid;place-items:center;font-size:clamp(34px,5.4vh,48px);background:#fffaf0;box-shadow:0 7px 0 rgba(31,58,95,.3),inset 0 0 0 5px #ffd84a}
    .rb-boble.under{background:#4a3426;box-shadow:0 7px 0 rgba(0,0,0,.4),inset 0 0 0 5px #b48cf0}
    .rb-boble.naeste{animation:rb-puls 1.3s ease-in-out infinite}
    @keyframes rb-puls{50%{transform:translate(-50%,-50%) scale(1.1)}}
    .rb-boble:active{transform:translate(-50%,-45%)}
    .rb-boble>img{width:86%;height:86%;pointer-events:none}
    .rb-boble small{position:absolute;top:calc(100% - .2em);left:50%;transform:translateX(-50%);display:flex;gap:1px;pointer-events:none}
    .rb-boble small img{width:clamp(22px,3.2vh,30px);height:auto;filter:drop-shadow(0 2px 1px rgba(0,0,0,.25))}
    /* Hjemme! */
    .rb-hjemme{position:absolute;inset:0;z-index:7;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2vh;
      padding-bottom:calc(6vh + env(safe-area-inset-bottom,0px));pointer-events:none}
    .rb-aebler{display:flex;gap:.4vh;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3))}
    .rb-aebler img{width:clamp(56px,10vh,92px);height:auto}
    .rb-hjemme .rb-row{display:flex;gap:20px;pointer-events:auto}
    .rb-videre{width:clamp(92px,14vh,130px);font-size:clamp(44px,7vh,64px);background:#5cc46b;color:#fff;box-shadow:0 7px 0 #3d8f4d;animation:rb-puls2 1.2s ease-in-out infinite}
    @keyframes rb-puls2{50%{transform:scale(1.08)}}
    @media (prefers-reduced-motion:reduce){.rb-boble.naeste,.rb-videre{animation:none}}
  `);

  let root, alive, timers, canvas, ctx, raf, last, acc, w, nr, forsoeg, sidstRoert, hjaelpFra, spor, traek, hjemmeT, gemt, ud, dybTest;
  let s = 1, ox = 0, oy = 0, cw = 0, ch = 0, dpr = 1, snit = 0;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = sel => root.querySelector(sel);
  const BANER = () => window.RULLEBANER || [];
  const hent = () => { try { return JSON.parse(localStorage.getItem(GEM)) || { baner: {} }; } catch (e) { return { baner: {} }; } };
  const gem = () => { try { localStorage.setItem(GEM, JSON.stringify(gemt)); } catch (e) {} };

  function maal() {
    const r = canvas.getBoundingClientRect();
    cw = r.width; ch = r.height; dpr = Math.min(2.5, devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    s = Math.min(cw / VB, ch / VH);
    ox = (cw - VB * s) / 2; oy = (ch - VH * s) / 2;
    ud = { l: -ox / s, r: (cw - ox) / s, t: -oy / s, b: (ch - oy) / s };
  }
  const tilVerden = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s]; };

  /* ---------- Banekortet ---------- */
  // Boblernes billeder tegnes med spillets egne figurer (i stedet for emoji, der ser forskellige ud på hver enhed):
  // pindsvinet i en snor (klip), på bladet/svampen (kast), glad (klaret), og æbler (fundet / ikke fundet endnu)
  const ikoner = {};
  function kortIkon(type, tema = "over") {
    const k = type + tema;
    if (ikoner[k]) return ikoner[k];
    const el = document.createElement("canvas"); el.width = el.height = 160;
    const c = el.getContext("2d"); c.scale(160 / 22, 160 / 22);
    if (tema === "under" && type !== "aeble" && type !== "tomt") {
      // det varme lys om pindsvinet, ligesom inde i banen (ellers forsvinder piggene i mørket)
      const g = c.createRadialGradient(11, 12.5, 1, 11, 12.5, 11);
      g.addColorStop(0, "rgba(255,214,150,.8)"); g.addColorStop(1, "rgba(255,214,150,0)");
      c.fillStyle = g; c.fillRect(0, 0, 22, 22);
    }
    if (type === "klip") {
      c.lineCap = "round";
      c.strokeStyle = "#5e3d1f"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(11, -1); c.lineTo(11, 7.5); c.stroke();
      c.strokeStyle = "#e8c690"; c.lineWidth = .95; c.stroke();
      tegnPindsvin(c, { x: 11, y: 13, rot: -.35 }, 0, null);
    } else if (type === "kast") {
      c.save(); c.beginPath(); c.rect(0, 0, 22, 21.2); c.clip(); // stilken klippes af i boblens bund
      tegnSlynge(c, { tema, statics: [] }, { x: 11, y: 18 });
      c.restore();
      tegnPindsvin(c, { x: 11, y: 12, rot: 0 }, 0, null);
    } else if (type === "hjemme") {
      c.translate(11, 12); c.scale(1.2, 1.2); c.translate(-11, -12);
      tegnPindsvin(c, { x: 10.2, y: 12.6, rot: 0 }, 0, 0);
    } else {
      c.translate(11, 12); c.scale(2.4, 2.4); c.translate(-11, -12);
      if (type === "aeble") tegnAeble(c, { x: 11, y: 12, taget: false, ikon: true }, 0, 0);
      else {
        // et æble, der ikke er fundet endnu: en lys skygge af et æble
        c.translate(11, 12.3);
        aebleSti(c, 2.75); fyldOgStreg(c, "rgba(255,255,255,.4)", "rgba(255,255,255,.95)", .5);
        c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = .65; c.lineCap = "round";
        c.beginPath(); c.moveTo(0, -1.65); c.quadraticCurveTo(.1, -3, .7, -3.9); c.stroke();
      }
    }
    return (ikoner[k] = el.toDataURL());
  }

  function visKort() {
    w = null; nr = -1;
    const baner = BANER(), N = baner.length;
    const foersteUnder = baner.findIndex(b => b.tema === "under");
    const hoejde = Math.max(ch, 190 + N * 120);
    const pos = baner.map((b, i) => [i % 2 ? 68 : 32, 140 + i * (hoejde - 230) / Math.max(1, N - 1)]); // fri af 🏠 foroven
    const graense = foersteUnder > 0 ? (pos[foersteUnder - 1][1] + pos[foersteUnder][1]) / 2 : foersteUnder === 0 ? 0 : hoejde;
    const naeste = baner.findIndex(b => gemt.baner[b.id] == null);
    const kort = q(".rb-kort");
    kort.style.background = `linear-gradient(#8fd3f7 0, #d6f0ff ${graense - 4}px, #5fae47 ${graense - 4}px, #5fae47 ${graense + 4}px, #8a5a32 ${graense + 4}px, #4a3426 ${graense + 150}px, #21170f 100%) local`; // local: baggrunden scroller med kortet
    kort.innerHTML = `${kortPynt(hoejde, graense)}<div class="rb-kort-in" style="height:${hoejde}px">
      <svg class="rb-sti" viewBox="0 0 100 ${hoejde}" preserveAspectRatio="none"><path d="${pos.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ")}"
        fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6" stroke-dasharray="2 3" vector-effect="non-scaling-stroke" style="stroke-width:6px"/></svg>
      ${baner.map((b, i) => {
        const best = gemt.baner[b.id], af = (b.elementer || []).filter(e => e.type === "aeble").length;
        const ikon = b.ikon ? b.ikon : `<img alt="" src="${kortIkon(best != null ? "hjemme" : (b.hjaelp || [])[0]?.type === "kast" ? "kast" : "klip", b.tema)}">`;
        return `<button class="rb-boble ${b.tema === "under" ? "under" : ""} ${i === naeste ? "naeste" : ""}" data-i="${i}"
          style="left:${pos[i][0]}%;top:${pos[i][1]}px" aria-label="Bane ${i + 1}">${ikon}
          <small>${Array.from({ length: af }, (_, k) => `<img alt="" src="${kortIkon(k < (best || 0) ? "aeble" : "tomt")}">`).join("")}</small></button>`;
      }).join("")}</div>`;
    kort.hidden = false;
    kort.querySelectorAll(".rb-boble").forEach(el => el.onclick = () => { Spil.sfx.click(); startBane(+el.dataset.i, true); });
    if (naeste > 1) kort.scrollTop = Math.max(0, pos[naeste][1] - ch / 2);
    q(".rb-hjemme").hidden = true;
    q(".rb-kort-knap").hidden = true;
    q(".rb-igen").hidden = true;
  }

  // Et lille billede tegnet med spillets egne figurer (til banekortet). bw × bh er i verdens enheder.
  const billeder = {};
  function billede(noegle, bw, bh, fn) {
    if (billeder[noegle]) return billeder[noegle];
    const el = document.createElement("canvas"), px = 8; el.width = Math.round(bw * px); el.height = Math.round(bh * px);
    const c = el.getContext("2d"); c.scale(px, px); fn(c);
    return (billeder[noegle] = el.toDataURL());
  }
  const pyntBillede = (noegle, bw, bh, p) => billede(noegle, bw, bh, c => tegnPynt(c, null, Object.assign({ fri: true }, p), 0, 0));

  // Banekortets landskab bag boblerne: sol, skyer, træer og blomster på græsset; rødder, lysende svampe og krystaller under jorden.
  // Alt er de samme tegninger som inde i banerne.
  function kortPynt(hoejde, graense) {
    const K = 3.6; // skærmpixels pr. verdens-enhed på kortet
    const img = (x, y, bw, bh, src, stil = "") => `<img alt="" src="${src}" style="left:${x}%;top:${y}px;width:${bw * K}px;height:${bh * K}px;margin-left:-${bw * K / 2}px;${stil}">`;
    const ting = [];
    const himmel = Math.min(graense, hoejde);
    if (himmel > 200) {
      ting.push(img(84, 14, 46, 46, pyntBillede("sol", 46, 46, { type: "sol", x: 23, y: 23 })));
      const sky = billede("sky", 48, 24, c => tegnSky(c, 13, 16, 9));
      for (let k = 0; 60 + k * 230 < himmel - 160; k++) {
        const x = k % 2 ? 76 + hash(k + 3) * 14 : 12 + hash(k + 5) * 14, sk = .65 + hash(k + 8) * .4;
        ting.push(img(x, 150 + k * 230, 48 * sk, 24 * sk, sky, "opacity:.95"));
      }
    }
    if (graense < hoejde && graense > 120) {
      // på græsset (bunden af hver ting står på græskanten)
      const paaGraes = (x, bw, bh, src) => ting.push(img(x, graense - 3 - bh * K, bw, bh, src));
      const trae = pyntBillede("trae", 26, 32, { type: "trae", x: 13, y: 31 });
      const busk = pyntBillede("busk", 22, 12, { type: "busk", x: 11, y: 11.4 });
      paaGraes(7, 26, 32, trae); paaGraes(93, 26, 32, trae); paaGraes(19, 22, 12, busk); paaGraes(80, 22, 12, busk);
      [[12, "#ff7fbf"], [27, "#b48cf0"], [72, "#ffd84a"], [87, "#ff7fbf"], [52, "#ffffff"]].forEach(([x, f]) =>
        paaGraes(x, 8, 9, pyntBillede("blomst" + f, 8, 9, { type: "blomst", x: 3.6, y: 8.5, farve: f })));
      // rødder fra græsset og ned
      [5, 16, 29, 41, 58, 71, 83, 95].forEach((x, k) => {
        const l = 40 + hash(k + 40) * 60, b = (hash(k + 50) - .5) * 24;
        const rod = `M20 0 Q${20 + b} ${l * .55} ${20 + b * .3} ${l}`, gren = `M${20 + b * .45} ${l * .45} q8 4 10 14`;
        ting.push(`<svg style="left:${x}%;top:${graense + 2}px;margin-left:-20px" width="40" height="${l + 4}" viewBox="0 0 40 ${l + 4}" fill="none" stroke-linecap="round">
          <path d="${rod}" stroke="#2c1a0e" stroke-width="7"/><path d="${gren}" stroke="#2c1a0e" stroke-width="5"/>
          <path d="${rod}" stroke="#7d5534" stroke-width="5"/><path d="${gren}" stroke="#7d5534" stroke-width="3"/>
          <path d="${rod}" stroke="rgba(255,226,180,.25)" stroke-width="1.4"/></svg>`);
      });
      // lysende svampe og krystaller ude i siderne
      for (let k = 0, y = graense + 150; y < hoejde - 50; k++, y += 120) {
        const x = k % 2 ? 86 + hash(k + 60) * 8 : 6 + hash(k + 70) * 8; // midten af tingen; holdes inde på skærmen
        if (k % 3 === 2) {
          const f = ["#b48cf0", "#ff9fd0", "#7fe3ff"][(k >> 1) % 3];
          ting.push(img(x, y, 26, 26, pyntBillede("krystal" + f, 26, 26, { type: "krystal", x: 13, y: 16.5, farve: f })));
        } else ting.push(img(x, y, 36, 36, pyntBillede("svamp", 36, 36, { type: "svamp", x: 18, y: 22.5, s: 1.4 })));
      }
    }
    return `<div class="rb-kort-pynt" style="height:${hoejde}px">${ting.join("")}</div>`;
  }

  /* ---------- En bane ---------- */
  function startBane(i, nyBane) {
    const def = BANER()[i]; if (!def) return visKort();
    const forrige = nr;
    nr = i; w = byg(def); spor = []; traek = null; hjemmeT = null;
    if (nyBane) { forsoeg = 0; hjaelpFra = null; }
    sidstRoert = performance.now();
    q(".rb-kort").hidden = true; q(".rb-hjemme").hidden = true;
    q(".rb-kort-knap").hidden = false; q(".rb-igen").hidden = false;
    if (nyBane) {
      const foersteUnder = def.tema === "under" && (forrige < 0 || BANER()[forrige]?.tema !== "under");
      const replik = def.replik || ((def.hjaelp || [])[0]?.type === "kast" ? "rulle-kast" : "rulle-klip");
      const tekst = { "rulle-kast": "Træk pindsvinet tilbage, som en elastik, og giv slip!", "rulle-klip": "Stryg over snoren med fingeren!" }[replik] || "";
      if (foersteUnder) Spil.say("Nu skal vi ned under jorden! " + tekst, null, ["rulle-under", replik]);
      else Spil.say(tekst, null, replik);
    }
  }

  function hov() {
    lyd("hov");
    forsoeg++;
    Spil.say("Hov! Prøv igen.", null, "rulle-hov");
    later(() => { startBane(nr, false); if (forsoeg >= 2) hjaelpFra = performance.now(); }, 1300);
  }

  function hjemme() {
    lyd("hjemme");
    hjemmeT = 0;
    const def = BANER()[nr], af = w.aebler.length, fik = w.fundet;
    if (!dybTest) { gemt.baner[def.id] = Math.max(gemt.baner[def.id] ?? 0, fik); gem(); }
    dybTest = false;
    Spil.burst(cw / 2, ch * .4, "🎉⭐🍎✨🦔🎊");
    later(() => Spil.burst(cw * .3, ch * .3, "⭐✨🌟"), 400); later(() => Spil.burst(cw * .7, ch * .35, "⭐✨🌟"), 700);
    if (af && fik === af) Spil.say("Hjemme! Godt klaret! Du fandt alle æblerne!", null, ["rulle-hjemme", "rulle-alle-aebler"]);
    else Spil.say("Hjemme! Godt klaret!", null, "rulle-hjemme");
    const el = q(".rb-hjemme");
    el.innerHTML = `${af ? `<div class="rb-aebler">${Array.from({ length: af }, (_, k) => `<img alt="" src="${kortIkon(k < fik ? "aeble" : "tomt")}">`).join("")}</div>` : ""}
      <div class="rb-row"><button class="rb-knap rb-videre" aria-label="Næste bane">▶</button></div>`;
    el.hidden = false;
    el.querySelector(".rb-videre").onclick = () => { Spil.sfx.click(); naesteBane(); };
    later(() => { if (w && w.status === "hjemme" && !q(".rb-hjemme").hidden) videreNaarStille(); }, 9000);
  }
  // Auto-videre: først når stemmen har sagt "Hjemme! Godt klaret!" færdig
  // (ellers afbryder den næste banes replik rosen). Højst 6 s ventetid. ▶ går videre med det samme.
  function videreNaarStille(fra = performance.now()) {
    if (!w || w.status !== "hjemme") return;
    if (Spil.isTalking() && performance.now() - fra < 6000) { later(() => videreNaarStille(fra), 120); return; }
    naesteBane();
  }
  function naesteBane() { if (nr + 1 < BANER().length) startBane(nr + 1, true); else visKort(); }

  /* ---------- Fingre ---------- */
  const fingre = new Map();
  function ned(e) {
    if (!w || w.status !== "spil") return;
    e.preventDefault();
    sidstRoert = performance.now(); hjaelpFra = forsoeg >= 2 ? hjaelpFra : null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const p = tilVerden(e), b = w.ball;
    // Tag fat i pindsvinet, hvis det ligger klar på slyngen
    if (w.slynge && !traek && vedSlynge(w) && fart(b) < 25 && Math.hypot(p[0] - b.x, p[1] - b.y) < R * 3.4) {
      traek = { id: e.pointerId, v: [0, 0] }; b.fast = true; return;
    }
    fingre.set(e.pointerId, p);
  }
  function flyt(e) {
    if (!w) return;
    const p = tilVerden(e);
    if (traek && e.pointerId === traek.id) {
      const sl = w.slynge;
      traek.v = begraensTraek(p[0] - sl.hx, p[1] - sl.hy);
      w.ball.x = w.ball.px = sl.hx + traek.v[0]; w.ball.y = w.ball.py = sl.hy + traek.v[1];
      return;
    }
    const fra = fingre.get(e.pointerId);
    if (!fra) return;
    spor.push({ x: p[0], y: p[1], t: performance.now() });
    if (w.status === "spil" && klip(w, fra, p)) { lyd("klip"); Spil.burst(e.clientX, e.clientY, "✂️✨"); }
    fingre.set(e.pointerId, p);
  }
  function op(e) {
    fingre.delete(e.pointerId);
    if (traek && e.pointerId === traek.id) {
      const v = traek.v; traek = null;
      const sl = w.slynge, b = w.ball;
      // Trukket hen mod hulen (den forkerte vej)? Så kastes der ikke; stemmen forklarer elastikken
      const forkert = w.hule && Math.abs(v[0]) > 4 && v[0] * (w.hule.x - sl.hx) > 0;
      if (Math.hypot(...v) > 3 && w.status === "spil" && !forkert) { kast(w, v); lyd("kast"); }
      else {
        b.fast = false; b.x = b.px = sl.hx; b.y = b.py = sl.hy;
        if (forkert) {
          lyd("hov");
          Spil.say("Den anden vej! Træk pindsvinet væk fra hulen, som en elastik, og giv slip.", null, "rulle-elastik");
          if (++forsoeg >= 2 && !hjaelpFra) hjaelpFra = performance.now();
        }
      }
    }
  }

  /* ---------- Løkken ---------- */
  function loop(nu) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    // Firefox på Android giver ujævne billedtider (fx 14, 19, 16 ms). Ligger et billede tæt på det
    // normale, bruges det normale, så fysikken får lige meget tid hvert billede og ikke hakker.
    const raa = Math.min(.05, (nu - last) / 1000 || 0); last = nu;
    if (raa > 0) snit = snit ? snit + (raa - snit) * .05 : raa;
    const dt = snit && Math.abs(raa - snit) < snit * .3 ? snit : raa;
    if (w && w.status === "spil") {
      acc += dt;
      while (acc >= H) { trin(w); acc -= H; if (w.status !== "spil") break; }
      for (const h of w.haendelser.splice(0)) {
        if (h === "boing") { lyd("boing"); w.trampoliner.forEach(t => t._puls = nu / 1000); }
        else if (h === "aeble") { lyd("aeble"); const sp = tilSkaerm(w.ball.x, w.ball.y); Spil.burst(sp[0], sp[1], "🍎✨"); }
        else if (h === "bump") { lyd("bump"); stoevPuf(w.ball.x, w.ball.y, w.tema === "under"); }
        else if (h === "hov") hov();
        else if (h === "hjemme") hjemme();
      }
      // Hjælp, hvis der ikke er rørt ved noget i et stykke tid
      if (!hjaelpFra && nu - sidstRoert > 8000) hjaelpFra = nu;
    } else acc = 0;
    if (hjemmeT != null) hjemmeT += dt;
    if (w) ballonerFlyver(w, dt, nu / 1000);
    // Fysikken er et stykke (acc) bagefter skærmens tid. Tegn pindsvinet og snorene dér, hvor de er
    // nået til lige nu, mellem sidste og næste skridt; ellers springer de 2, 3 eller 4 skridt pr. billede.
    const flyt = w && w.status === "spil" ? mellemSkridt(w, acc / H) : null;
    tegn(nu / 1000);
    if (flyt) flyt();
  }
  function mellemSkridt(w, a) {
    const b = w.ball, ps = b.fast ? w.parts : w.parts.concat(b), gl = ps.map(p => [p.x, p.y]), rot = b.rot;
    const k = 1 - a;
    ps.forEach(p => { p.x -= (p.x - p.px) * k; p.y -= (p.y - p.py) * k; });
    if (!b.fast) b.rot -= (b.kontakt ? b.spin : b.spin * .995) * k;
    return () => { ps.forEach((p, i) => { p.x = gl[i][0]; p.y = gl[i][1]; }); b.rot = rot; };
  }
  const tilSkaerm = (x, y) => { const r = canvas.getBoundingClientRect(); return [r.left + ox + x * s, r.top + oy + y * s]; };

  function tegn(t) {
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!w) { c.fillStyle = "#21170f"; c.fillRect(0, 0, cw, ch); return; }
    tegnBaggrund(c, w, cw, ch, t);
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // Ting der står på jorden tegnes før jorden, så den del der når ned i jorden bliver skjult
    (w.def.pynt || []).forEach((p, i) => p.bag !== false && tegnPynt(c, w, p, t, i));
    if (w.hule) tegnHule(c, w, w.hule, t);
    w.trampoliner.forEach(e => tegnTrampolin(c, w, e, t));
    if (w.slynge) tegnSlynge(c, w, w.slynge);
    // Jord, vægge og planker står stille: de tegnes én gang til et lag og kopieres ind hver gang
    if (!w._lag || w._lag.width !== canvas.width || w._lag.height !== canvas.height) {
      const lag = w._lag = document.createElement("canvas"); lag.width = canvas.width; lag.height = canvas.height;
      const l = lag.getContext("2d"); l.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      w.jord.forEach(e => tegnJord(l, w, e, ud));
      if (w.tema === "under") w.jord.forEach(e => e.fyld === "op" && !e.skjult && tegnRoedder(l, w, e, ud));
      w.planker.forEach(e => tegnPlanke(l, w, e));
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(w._lag, 0, 0);
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    w.aebler.forEach((a, i) => tegnAeble(c, a, t, i));
    tegnStoev(c, RM.matches ? 1 : Math.min(.05, t - (tegn.sidst ?? t))); tegn.sidst = t;
    // elastikken og den prikkede bane, mens man trækker
    if (traek && w.slynge) {
      const sl = w.slynge, b = w.ball;
      c.strokeStyle = "#7a5530"; c.lineWidth = .8; c.beginPath(); c.moveTo(sl.x - 5, sl.y - 1); c.lineTo(b.x, b.y); c.lineTo(sl.x + 5, sl.y - 1); c.stroke();
      const vx = -traek.v[0] * K, vy = -traek.v[1] * K;
      c.fillStyle = "rgba(255,255,255,.9)";
      for (let k = 1; k <= 9; k++) { const tt = k * .07; c.beginPath(); c.arc(sl.hx + vx * tt, sl.hy + vy * tt + G * tt * tt / 2, 1.1 - k * .07, 0, 7); c.fill(); }
    }
    w.ropes.forEach((r, i) => tegnSnor(c, r, w, i, t));
    // pindsvinet (hjemme: glider ind i hulen og danser)
    if (hjemmeT != null && w.hule) {
      const k = Math.min(1, hjemmeT / .35), h = w.hule;
      const b = { x: w.ball.x + (h.x - w.ball.x) * k, y: w.ball.y + (h.y - 1 - w.ball.y) * k, rot: w.ball.rot };
      tegnPindsvin(c, b, t, hjemmeT > .35 ? hjemmeT - .35 : null);
    } else tegnPindsvin(c, w.ball, t, null);
    // strøget fra fingeren
    const nu = performance.now();
    spor = spor.filter(p => nu - p.t < 220);
    if (spor.length > 1) {
      c.lineCap = "round"; c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.3;
      c.beginPath(); spor.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    }
    // Under jorden: dunkelt, men med varmt lys om pindsvinet, hulen, svampene og ildfluerne
    if (w.tema === "under") morke(c, t);
    if (hjaelpFra && w.status === "spil") tegnHjaelp(c, (performance.now() - hjaelpFra) / 1000);
  }

  let skyggeLag = null;
  function morke(c, t) {
    if (!skyggeLag || skyggeLag.width !== canvas.width || skyggeLag.height !== canvas.height) {
      skyggeLag = document.createElement("canvas"); skyggeLag.width = canvas.width; skyggeLag.height = canvas.height;
    }
    const m = skyggeLag.getContext("2d");
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = "source-over";
    m.clearRect(0, 0, skyggeLag.width, skyggeLag.height);
    m.fillStyle = "rgba(14,8,22,.5)"; m.fillRect(0, 0, skyggeLag.width, skyggeLag.height);
    m.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    m.globalCompositeOperation = "destination-out";
    const lys = (x, y, r) => { const g = m.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); m.fillStyle = g; m.beginPath(); m.arc(x, y, r, 0, 7); m.fill(); };
    lys(w.ball.x, w.ball.y, 34);
    if (w.hule) lys(w.hule.x, w.hule.y, 26);
    if (w.slynge) lys(w.slynge.x, w.slynge.y, 18);
    (w.def.pynt || []).forEach(p => p.type === "svamp" && lys(p.x, p.y - 3, 16 * (p.s ?? 1)));
    w.trampoliner.forEach(e => lys((e.fra[0] + e.til[0]) / 2, (e.fra[1] + e.til[1]) / 2, 18));
    w.aebler.forEach(a => !a.taget && lys(a.x, a.y, 9));
    const fl = ildfluer(t, ud);
    fl.forEach(f => lys(f.x, f.y, 7));
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(skyggeLag, 0, 0);
    // selve ildfluerne
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    fl.forEach((f, i) => {
      const a = .55 + .45 * Math.sin(t * 3 + i * 1.7);
      c.fillStyle = `rgba(255,230,140,${a})`; c.beginPath(); c.arc(f.x, f.y, .9, 0, 7); c.fill();
    });
  }

  // Hjælpe-hånden: viser banens løsning (klip: et strøg; kast: træk tilbage og slip)
  function tegnHjaelp(c, t) {
    // Vis det første trin, der stadig mangler: et klip tæller som gjort, når snoren det rammer er klippet
    const helSnor = h => w.ropes.some(r => r.led.every(l => l.on) && r.led.some(l => krydser(h.fra, h.til, l.a, l.b)));
    const h = (BANER()[nr].hjaelp || []).find(h => h.type !== "klip" || helSnor(h)); if (!h) return;
    const T = 1.8, k = (t % T) / T;
    let x, y, synlig = 1;
    if (h.type === "klip") {
      const e = Math.min(1, Math.max(0, (k - .15) / .6));
      x = h.fra[0] + (h.til[0] - h.fra[0]) * e; y = h.fra[1] + (h.til[1] - h.fra[1]) * e;
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1; c.setLineDash([2, 2]);
      c.beginPath(); c.moveTo(...h.fra); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    } else if (h.type === "kast" && w.slynge) {
      const e = Math.min(1, Math.max(0, (k - .15) / .55)), sl = w.slynge;
      x = sl.hx + h.traek[0] * e; y = sl.hy + h.traek[1] * e;
      if (k > .78) synlig = 0;
    } else return;
    if (k > .9) synlig = 0;
    c.globalAlpha = synlig; c.font = "11px serif"; c.textAlign = "center"; c.textBaseline = "top";
    c.fillText("👆", x + 1, y - 1.5); c.globalAlpha = 1;
  }

  // Dybt link til test (Spil.dyb): "kort" = banekortet, "bane-3" eller et bane-id (fx "under-1") = start banen,
  // "hjaelp-3" = banen med hjælpe-hånden fremme, "hjemme-3" = banen klaret med alle æbler (gemmes ikke).
  // Returnerer true, hvis linket startede en bane.
  function dybtLink(d) {
    const m = d.match(/^(bane|hjaelp|hjemme)-(\d+)$/);
    let i = m ? +m[2] - 1 : BANER().findIndex(b => b.id === d);
    if (!BANER()[i]) return false;
    startBane(i, true);
    if (m && m[1] === "hjaelp") { forsoeg = 2; hjaelpFra = performance.now(); }
    if (m && m[1] === "hjemme") {
      dybTest = true;
      w.aebler.forEach(a => a.taget = true); w.fundet = w.aebler.length;
      w.ropes.forEach(r => r.led.forEach(l => l.on = false));
      const b = w.ball, h = w.hule; b.fast = false; b.x = b.px = h.x; b.y = b.py = h.y;
    }
    return true;
  }

  Spil.register({
    id: "rullebanen", navn: "Rullebanen", ikon: "🦔", farve: "#c9e7a7",
    start(r) {
      Spil.preload(["rulle-hej", "rulle-klip", "rulle-kast", "rulle-hov", "rulle-elastik", "rulle-hjemme", "rulle-under", "rulle-alle-aebler"]);
      alive = true; timers = []; acc = 0; snit = 0; last = performance.now(); gemt = hent(); w = null; nr = -1; forsoeg = 0; hjaelpFra = null; spor = []; traek = null; hjemmeT = null;
      r.innerHTML = `<div class="rb">
        <canvas class="rb-c" aria-label="Rullebanen"></canvas>
        <div class="rb-knapper"><button class="rb-knap rb-igen" aria-label="Start forfra" hidden>↻</button><button class="rb-knap rb-kort-knap" aria-label="Banerne" hidden>🗺️</button></div>
        <div class="rb-hjemme" hidden></div>
        <div class="rb-kort" hidden></div></div>`;
      root = r.querySelector(".rb");
      canvas = q(".rb-c"); ctx = canvas.getContext("2d");
      maal();
      addEventListener("resize", maal);
      canvas.addEventListener("pointerdown", ned);
      canvas.addEventListener("pointermove", flyt);
      canvas.addEventListener("pointerup", op);
      canvas.addEventListener("pointercancel", op);
      q(".rb-igen").onclick = () => { if (w) { Spil.sfx.click(); startBane(nr, false); } };
      q(".rb-kort-knap").onclick = () => { Spil.sfx.click(); visKort(); };
      dybTest = false;
      visKort();
      if (!dybtLink(Spil.dyb || "")) Spil.say("Hjælp det lille pindsvin hjem til sin hule! Vælg en bane!", null, ["rulle-hej", "rulle-vaelg"]);
      raf = requestAnimationFrame(loop);
    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      removeEventListener("resize", maal); fingre.clear();
    }
  });

  // Til test og til at bygge nye baner: Spil.rullebanen.simuler(BANER[i]) kører banens løsning uden skærm
  Spil.rullebanen = { byg, trin, klip, kast, simuler, ELEMENTER, VB, VH };
})();
