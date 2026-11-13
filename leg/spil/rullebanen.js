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
     ===================================================================== */
  // Lille fast tilfældighed, så sten/rødder ser ens ud hver gang
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

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
    over: { himmel: ["#8fd3f7", "#d6f0ff"], jord: ["#b07a45", "#7a4f2a"], kant: "#5fae47", kant2: "#8fd16f", planke: "#c98a4c" },
    under: { himmel: ["#4a3426", "#21170f"], jord: ["#5b3d28", "#3a2618"], kant: "#7a5236", kant2: "#9a6b46", planke: "#a8733f" },
  };

  function tegnBaggrund(c, v, cw, ch, t) {
    const th = TEMA[v.tema];
    const g = c.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, th.himmel[0]); g.addColorStop(1, th.himmel[1]);
    c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    if (v.tema === "over") {
      // skyer der driver hen over hele skærmen
      c.fillStyle = "rgba(255,255,255,.92)";
      [[.12, .1, 1], [.55, .2, .7], [.85, .07, .85]].forEach(([x, y, s], i) => {
        const fx = ((x * cw + (RM.matches ? 0 : t * (8 + i * 4))) % (cw + 200)) - 100, fy = y * ch, r = 26 * s * Math.max(1, cw / 900);
        c.beginPath(); c.arc(fx, fy, r, 0, 7); c.arc(fx + r * 1.1, fy - r * .4, r * 1.2, 0, 7); c.arc(fx + r * 2.2, fy, r * .9, 0, 7); c.fill();
      });
    } else {
      // en svag varm glød fra midten (rødderne hænger fra loftet, se tegnRoedder)
      const gl = c.createRadialGradient(cw / 2, ch * .45, 10, cw / 2, ch * .45, Math.max(cw, ch) * .7);
      gl.addColorStop(0, "rgba(255,190,120,.10)"); gl.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gl; c.fillRect(0, 0, cw, ch);
    }
  }

  // Jord med græskant (over) eller jordkant (under). Rører linjen verdens kant, fortsætter den ud til skærmens kant.
  function tegnJord(c, v, e, ud) {
    if (e.skjult) return; // usynlig kant, fx så pindsvinet ikke ryger ud af skærmen
    const th = TEMA[v.tema], p = e.punkter.slice();
    if (e.fyld !== "ingen") {
      if (p[0][0] <= 0) p.unshift([ud.l - 5, p[0][1]]);
      if (p[p.length - 1][0] >= VB) p.push([ud.r + 5, p[p.length - 1][1]]);
    }
    c.lineJoin = c.lineCap = "round";
    if (e.fyld === "ned" || e.fyld === "op") {
      const kant = e.fyld === "ned" ? ud.b + 5 : ud.t - 5;
      const g = c.createLinearGradient(0, e.fyld === "ned" ? Math.min(...p.map(q => q[1])) : kant, 0, e.fyld === "ned" ? kant : Math.max(...p.map(q => q[1])));
      g.addColorStop(0, th.jord[0]); g.addColorStop(1, th.jord[1]);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(p[0][0], kant);
      p.forEach(q => c.lineTo(q[0], q[1]));
      c.lineTo(p[p.length - 1][0], kant); c.closePath(); c.fill();
      // små sten i jorden
      c.fillStyle = v.tema === "over" ? "rgba(90,55,25,.35)" : "rgba(20,10,5,.35)";
      for (let i = 0; i < p.length - 1; i++) for (let k = 0; k < 3; k++) {
        const t = hash(i * 7 + k), x = p[i][0] + (p[i + 1][0] - p[i][0]) * t, y = p[i][1] + (p[i + 1][1] - p[i][1]) * t;
        c.beginPath(); c.ellipse(x, y + (e.fyld === "ned" ? 1 : -1) * (5 + hash(i + k * 3) * 10), 1.4, .9, 0, 0, 7); c.fill();
      }
      c.strokeStyle = th.kant; c.lineWidth = (e.tyk ?? 1) * 2 + 1.2;
      c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
      c.strokeStyle = th.kant2; c.lineWidth = 1;
      c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1] - (e.fyld === "ned" ? .7 : -.7)) : c.moveTo(q[0], q[1] - (e.fyld === "ned" ? .7 : -.7))); c.stroke();
    } else {
      const tyk = e.tyk ?? 1;
      // afstand fra punktet q til et linjestykke
      const afstand = (q, st) => {
        const ex = st.bx - st.ax, ey = st.by - st.ay, l2 = ex * ex + ey * ey || 1e-9;
        const t = Math.max(0, Math.min(1, ((q[0] - st.ax) * ex + (q[1] - st.ay) * ey) / l2));
        return Math.hypot(q[0] - st.ax - ex * t, q[1] - st.ay - ey * t);
      };
      // en ende er fri, hvis den ikke rører anden jord
      const fri = p.length === 2 ? p.map(q => !v.statics.some(st => !(st.ax === p[0][0] && st.ay === p[0][1] && st.bx === p[1][0] && st.by === p[1][1]) && afstand(q, st) < tyk + st.t + .8)) : [false, false];
      if (fri[0] || fri[1]) {
        // en fritstående pæl: en træstamme med bark og årringe i den frie ende (før: en tynd pind med en grøn stribe)
        const [[ax, ay], [bx, by]] = p, l = Math.hypot(bx - ax, by - ay);
        c.save(); c.translate(ax, ay); c.rotate(Math.atan2(by - ay, bx - ax));
        const g = c.createLinearGradient(0, -tyk, 0, tyk);
        g.addColorStop(0, "#7a4f2a"); g.addColorStop(.45, "#a87445"); g.addColorStop(1, "#5e3b1e");
        c.fillStyle = g; c.beginPath(); c.roundRect(-tyk * .3, -tyk, l + tyk * .6, tyk * 2, tyk * .3); c.fill();
        c.strokeStyle = "rgba(60,35,15,.55)"; c.lineWidth = .35; c.lineCap = "round";
        [[-.55, .1, .7], [.05, .3, .95], [.5, .05, .55], [-.15, .55, .9]].forEach(([y, f0, f1]) => {
          c.beginPath(); c.moveTo(l * f0, y * tyk); c.lineTo(l * f1, y * tyk + .15); c.stroke();
        });
        fri.forEach((er, k) => {
          if (!er) return;
          const x = k ? l + tyk * .3 : -tyk * .3;
          c.fillStyle = "#e6c08a"; c.beginPath(); c.ellipse(x, 0, tyk * .42, tyk * .98, 0, 0, 7); c.fill();
          c.strokeStyle = "#b88a52"; c.lineWidth = .3;
          [.62, .3].forEach(f => { c.beginPath(); c.ellipse(x, 0, tyk * .42 * f, tyk * .98 * f, 0, 0, 7); c.stroke(); });
        });
        c.restore();
      } else {
        // en kant mellem to stykker jord
        c.strokeStyle = th.jord[1]; c.lineWidth = tyk * 2;
        c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
        c.strokeStyle = th.kant; c.lineWidth = Math.max(.8, tyk * .5);
        c.stroke();
      }
    }
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
        const l = 5 + hash(k + 57) * 12, b = (hash(k + 83) - .5) * 5, tyk = .7 + hash(k + 11) * .9;
        c.strokeStyle = "#6e4a2c"; c.lineWidth = tyk;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + b, y + l * .55, x + b * .3, y + l); c.stroke();
        // en lille sidegren på de lange rødder
        if (l > 10) {
          const sy = y + l * .45, sx = x + b * .45;
          c.lineWidth = tyk * .6;
          c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 2.2, sy + 1, sx + 2.6, sy + 3.4); c.stroke();
        }
      }
    }
  }

  function tegnPlanke(c, v, e) {
    c.lineCap = "round";
    c.strokeStyle = "#6b4423"; c.lineWidth = 3.6;
    c.beginPath(); c.moveTo(...e.fra); c.lineTo(...e.til); c.stroke();
    c.strokeStyle = TEMA[v.tema].planke; c.lineWidth = 2.4; c.stroke();
  }

  function tegnTrampolin(c, v, e, t) {
    const [ax, ay] = e.fra, [bx, by] = e.til, mx = (ax + bx) / 2, my = (ay + by) / 2;
    const ang = Math.atan2(by - ay, bx - ax), l = Math.hypot(bx - ax, by - ay);
    // ben (over) eller stilk (under) ned til jorden
    if (v.tema === "over") {
      c.fillStyle = "#6b4423";
      [[ax + (bx - ax) * .12, ay + (by - ay) * .12], [ax + (bx - ax) * .88, ay + (by - ay) * .88]].forEach(([x, y]) => c.fillRect(x - .6, y, 1.2, paaJord(v, x, y) + 2 - y));
    } else {
      c.fillStyle = "#e9d7c0"; c.beginPath(); c.roundRect(mx - 1.6, my, 3.2, paaJord(v, mx, my) + 2 - my, 1.2); c.fill();
    }
    c.save(); c.translate(mx, my); c.rotate(ang);
    const bump = e._puls ? Math.max(0, 1 - (t - e._puls) * 4) : 0;
    if (v.tema === "over") {
      c.fillStyle = "#ff6b6b"; c.beginPath(); c.roundRect(-l / 2, -1.4 + bump, l, 2.8, 1.4); c.fill();
      c.fillStyle = "#fff"; for (let i = 0; i < 4; i++) c.fillRect(-l / 2 + (i * 2 + .5) * l / 8, -1.4 + bump, l / 8, 2.8);
    } else {
      // stor lysende svampehat
      const g = c.createLinearGradient(0, -5, 0, 2); g.addColorStop(0, "#d58cff"); g.addColorStop(1, "#8f4fd1");
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 1 + bump, l / 2 + 1, 5 - bump, 0, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)";
      [[-.25, -2.5], [.1, -3.5], [.32, -1.8]].forEach(([x, y]) => { c.beginPath(); c.arc(x * l, y + bump, .9, 0, 7); c.fill(); });
    }
    c.restore();
  }

  function tegnHule(c, v, h, t) {
    if (v.tema === "over") {
      // en lille jordhøj med en mørk indgang og en græstot
      // Højen og indgangen fortsætter ned til jorden; jorden tegnes bagefter og dækker resten
      const bund = Math.max(paaJord(v, h.x - h.r - 6, h.y), paaJord(v, h.x, h.y), paaJord(v, h.x + h.r + 6, h.y)) + 4;
      c.fillStyle = "#8a5a32"; c.beginPath(); c.ellipse(h.x, h.y + 4, h.r + 6, h.r + 3, 0, Math.PI, 0);
      c.lineTo(h.x + h.r + 6, bund); c.lineTo(h.x - h.r - 6, bund); c.closePath(); c.fill();
      c.fillStyle = "#2b1a0e"; c.beginPath(); c.ellipse(h.x, h.y + 4, h.r - 1, h.r - 2, 0, Math.PI, 0);
      c.lineTo(h.x + h.r - 1, bund); c.lineTo(h.x - h.r + 1, bund); c.closePath(); c.fill();
      c.strokeStyle = "#5fae47"; c.lineWidth = 1.3; c.lineCap = "round";
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(h.x + i * 2.2, h.y - h.r + 1.2); c.lineTo(h.x + i * 2.6, h.y - h.r - 1.6 - Math.abs(i % 2)); c.stroke(); }
    } else {
      // rund hobbit-dør af træplanker i en ring af sten, med et lille oplyst vindue og et dørhåndtag.
      // Når pindsvinet er hjemme, står døren åben, og der er lys derinde.
      const glo = .75 + (RM.matches ? 0 : Math.sin(t * 2) * .1), r = h.r, aaben = v.status === "hjemme";
      const g = c.createRadialGradient(h.x, h.y, 2, h.x, h.y, r + 14);
      g.addColorStop(0, `rgba(255,200,120,${.35 * glo})`); g.addColorStop(1, "rgba(255,200,120,0)");
      c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, r + 14, 0, 7); c.fill();
      // dørkarmen fortsætter ned til jorden
      const bund = paaJord(v, h.x, h.y) + 3;
      c.fillStyle = "#4a3020"; c.fillRect(h.x - r - 1.5, h.y, 2 * r + 3, bund - h.y);
      // stenene i ringen
      c.fillStyle = "#5a4a40"; c.beginPath(); c.arc(h.x, h.y, r + 2.4, 0, 7); c.fill();
      for (let i = 0; i < 14; i++) {
        const a0 = i / 14 * Math.PI * 2 + .03, a1 = a0 + Math.PI * 2 / 14 - .07;
        c.fillStyle = i % 2 ? "#8a7a6c" : "#9c8b7b";
        c.beginPath(); c.arc(h.x, h.y, r + 2.1, a0, a1); c.arc(h.x, h.y, r + .4, a1, a0, true); c.closePath(); c.fill();
      }
      if (aaben) {
        // varmt lys inde i hulen, og døren svinget op mod venstre
        const ind = c.createRadialGradient(h.x, h.y + 1, 1, h.x, h.y, r);
        ind.addColorStop(0, "#fff4d8"); ind.addColorStop(1, "#efb768");
        c.fillStyle = ind; c.beginPath(); c.arc(h.x, h.y, r, 0, 7); c.fill();
        c.fillStyle = "#a8642f"; c.beginPath(); c.ellipse(h.x - r * .92, h.y, r * .28, r * .98, 0, 0, 7); c.fill();
        c.strokeStyle = "#6e3f1c"; c.lineWidth = .35; c.stroke();
      } else {
        c.save(); c.beginPath(); c.arc(h.x, h.y, r, 0, 7); c.clip();
        const tr = c.createLinearGradient(h.x, h.y - r, h.x, h.y + r);
        tr.addColorStop(0, "#c17f45"); tr.addColorStop(1, "#8f5428");
        c.fillStyle = tr; c.fillRect(h.x - r, h.y - r, 2 * r, 2 * r);
        // planker
        c.strokeStyle = "rgba(90,50,20,.75)"; c.lineWidth = .35;
        for (let k = -2; k <= 2; k++) { const x = h.x + k * r * .38; c.beginPath(); c.moveTo(x, h.y - r); c.lineTo(x, h.y + r); c.stroke(); }
        c.restore();
        // vindue med krydspost og varmt lys
        const vy = h.y - r * .42, vr = r * .27;
        c.fillStyle = "#5a3418"; c.beginPath(); c.arc(h.x, vy, vr + .5, 0, 7); c.fill();
        c.fillStyle = `rgba(255,214,140,${glo})`; c.beginPath(); c.arc(h.x, vy, vr, 0, 7); c.fill();
        c.strokeStyle = "#5a3418"; c.lineWidth = .4;
        c.beginPath(); c.moveTo(h.x - vr, vy); c.lineTo(h.x + vr, vy); c.moveTo(h.x, vy - vr); c.lineTo(h.x, vy + vr); c.stroke();
        // dørhåndtag
        c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(h.x + r * .58, h.y + r * .12, r * .1 + .3, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(h.x + r * .55, h.y + r * .08, .25, 0, 7); c.fill();
      }
    }
  }

  function tegnAeble(c, a, t, i) {
    if (a.taget) return;
    const y = a.y + (RM.matches ? 0 : Math.sin(t * 2.4 + i) * .8);
    c.fillStyle = "#e8413b"; c.beginPath(); c.arc(a.x - 1, y, 2.6, 0, 7); c.arc(a.x + 1, y, 2.6, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(a.x - 1.6, y - 1, .8, 0, 7); c.fill();
    c.strokeStyle = "#6b4423"; c.lineWidth = .6; c.beginPath(); c.moveTo(a.x, y - 2.4); c.lineTo(a.x + .4, y - 4); c.stroke();
    c.fillStyle = "#5fae47"; c.beginPath(); c.ellipse(a.x + 1.4, y - 3.6, 1.4, .7, -.5, 0, 7); c.fill();
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
  const BALLONFARVER = [["#ff5e6c", "#c9304a"], ["#ffc93c", "#d9951a"], ["#5eb8ff", "#2f7fcf"]];
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
    const a = r.anker, [lys, mork] = BALLONFARVER[i % BALLONFARVER.length];
    const sving = RM.matches ? 0 : Math.sin(t * 1.4 + i * 2) * .07;
    c.save(); c.translate(a.x, a.y); c.rotate(sving);
    c.strokeStyle = "rgba(90,60,40,.8)"; c.lineWidth = .35;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(.8, -1, 0, -2.2); c.stroke();
    const g = c.createRadialGradient(-1.4, -8.6, .5, 0, -6.8, 5.4);
    g.addColorStop(0, lys); g.addColorStop(1, mork);
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -6.8, 4, 4.6, 0, 0, 7); c.fill();
    c.fillStyle = mork; c.beginPath(); c.moveTo(0, -2.4); c.lineTo(.9, -1.5); c.lineTo(-.9, -1.5); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(-1.5, -8.4, .9, 1.5, -.5, 0, 7); c.fill();
    c.restore();
  }

  function tegnSnor(c, r, v, i, t) {
    c.lineCap = c.lineJoin = "round";
    if (snorBallon(v, r)) tegnBallon(c, v, r, i, t);
    else {
      // knagen i loftet
      c.fillStyle = "#6b4423"; c.beginPath(); c.arc(r.anker.x, r.anker.y, 1.8, 0, 7); c.fill();
      c.fillStyle = "#c98a4c"; c.beginPath(); c.arc(r.anker.x, r.anker.y, 1, 0, 7); c.fill();
    }
    // snoren tegnes i de stykker, der stadig hænger sammen
    const stykker = []; let cur = null;
    r.led.forEach(l => { if (l.on) { if (!cur) { cur = [l.a]; stykker.push(cur); } cur.push(l.b); } else cur = null; });
    stykker.forEach(s => {
      c.beginPath(); s.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
      c.strokeStyle = "#7a5530"; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = "#d9b27c"; c.lineWidth = .8; c.stroke();
    });
  }

  function tegnSlynge(c, v, s) {
    const fod = paaJord(v, s.x, s.y + 1) + 3;
    if (v.tema === "over") {
      c.strokeStyle = "#3d7f3a"; c.lineWidth = 1.4; c.lineCap = "round";
      c.beginPath(); c.moveTo(s.x, s.y + 1); c.quadraticCurveTo(s.x - 3, (s.y + fod) / 2, s.x + 1, fod); c.stroke();
      c.fillStyle = "#6cc04f"; c.beginPath(); c.ellipse(s.x - 2.2, (s.y + fod) / 2 + 1, 2.4, 1, -.6, 0, 7); c.fill();
      c.fillStyle = "#5fae47"; c.beginPath(); c.ellipse(s.x, s.y + .4, 8, 2.2, 0, 0, 7); c.fill();
      c.strokeStyle = "#3d7f3a"; c.lineWidth = .5; c.beginPath(); c.moveTo(s.x - 7, s.y + .4); c.lineTo(s.x + 7, s.y + .4); c.stroke();
    } else {
      c.fillStyle = "#e9d7c0"; c.beginPath(); c.roundRect(s.x - 1.8, s.y, 3.6, fod - s.y, 1.4); c.fill();
      c.fillStyle = "#ffb347"; c.beginPath(); c.ellipse(s.x, s.y + 1, 8, 3.4, 0, Math.PI, 0); c.closePath(); c.fill();
    }
  }

  // Pindsvinet: sammenrullet kugle med pigge og et lille ansigt, eller udrullet og glad (når det er hjemme)
  function tegnPindsvin(c, b, t, hjemme) {
    c.save(); c.translate(b.x, b.y);
    if (hjemme != null) {
      const hop = Math.abs(Math.sin(hjemme * 7)) * 3 * Math.min(1, hjemme * 2);
      c.translate(0, -hop);
      c.fillStyle = "#6b4423";
      for (let i = 0; i < 9; i++) { const a = Math.PI + .2 + i * .34; c.beginPath(); c.moveTo(Math.cos(a) * 4, Math.sin(a) * 3.4); c.lineTo(Math.cos(a) * 8, Math.sin(a) * 6.5 - 1); c.lineTo(Math.cos(a + .25) * 4, Math.sin(a + .25) * 3.4); c.fill(); }
      c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(0, 0, 6, 4.4, 0, 0, 7); c.fill();
      c.fillStyle = "#f3d9b8"; c.beginPath(); c.ellipse(4.2, .6, 3.4, 2.8, 0, 0, 7); c.fill();
      c.fillStyle = "#2b1a0e"; c.beginPath(); c.arc(7.4, .2, .9, 0, 7); c.fill();
      c.beginPath(); c.arc(4.4, -.6, .7, 0, 7); c.fill();
      c.fillStyle = "#ff9fb0"; c.beginPath(); c.arc(4.6, 1.6, .6, 0, 7); c.fill();
      c.fillStyle = "#6b4423"; c.fillRect(-3, 3.6, 1.6, 2); c.fillRect(2, 3.6, 1.6, 2);
      c.restore(); return;
    }
    c.rotate(b.rot);
    // pigge
    c.fillStyle = "#5e3b1e";
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      if (Math.cos(a) > .55 && Math.sin(a) > -.5 && Math.sin(a) < .6) continue; // ansigtet
      c.beginPath(); c.moveTo(Math.cos(a - .18) * 4.2, Math.sin(a - .18) * 4.2);
      c.lineTo(Math.cos(a) * 6.4, Math.sin(a) * 6.4); c.lineTo(Math.cos(a + .18) * 4.2, Math.sin(a + .18) * 4.2); c.fill();
    }
    c.fillStyle = "#a06a3c"; c.beginPath(); c.arc(0, 0, 4.6, 0, 7); c.fill();
    c.fillStyle = "#c48a55"; c.beginPath(); c.arc(-1, -1.2, 2.6, 0, 7); c.fill();
    // ansigt
    c.fillStyle = "#f3d9b8"; c.beginPath(); c.ellipse(3, .3, 2.6, 2.3, 0, 0, 7); c.fill();
    c.fillStyle = "#2b1a0e"; c.beginPath(); c.arc(5.3, .2, .8, 0, 7); c.fill();
    c.beginPath(); c.arc(2.8, -.8, .55, 0, 7); c.fill();
    c.restore();
  }

  function tegnPynt(c, v, p0, t, i) {
    const p = p0.type === "sol" || p0.fri ? p0 : Object.assign({}, p0, { y: paaJord(v, p0.x, p0.y - 8, 24) + .6 });
    const vugge = RM.matches ? 0 : Math.sin(t * 1.5 + i) * .08;
    if (p.type === "svamp") {
      const s = p.s ?? 1;
      const g = c.createRadialGradient(p.x, p.y - 3 * s, 1, p.x, p.y - 3 * s, 12 * s);
      g.addColorStop(0, "rgba(120,230,255,.35)"); g.addColorStop(1, "rgba(120,230,255,0)");
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y - 3 * s, 12 * s, 0, 7); c.fill();
      c.save(); c.translate(p.x, p.y); c.rotate(vugge); c.scale(s, s);
      c.fillStyle = "#e9e3d6"; c.fillRect(-.8, -4, 1.6, 4);
      c.fillStyle = "#7fe3ff"; c.beginPath(); c.ellipse(0, -4, 3.4, 2.2, 0, Math.PI, 0); c.closePath(); c.fill();
      c.restore();
    } else if (p.type === "blomst") {
      c.save(); c.translate(p.x, p.y); c.rotate(vugge);
      c.strokeStyle = "#3d7f3a"; c.lineWidth = .6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -5); c.stroke();
      c.fillStyle = p.farve || "#ff7fbf";
      for (let k = 0; k < 5; k++) { const a = k / 5 * 7; c.beginPath(); c.arc(Math.cos(a) * 1.3, -5 + Math.sin(a) * 1.3, 1.1, 0, 7); c.fill(); }
      c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(0, -5, .8, 0, 7); c.fill();
      c.restore();
    } else if (p.type === "trae") {
      c.fillStyle = "#8a5a32"; c.fillRect(p.x - 1.5, p.y - 14, 3, 14);
      c.fillStyle = "#5fae47"; c.beginPath(); c.arc(p.x, p.y - 18, 9, 0, 7); c.fill();
      c.fillStyle = "#8fd16f"; c.beginPath(); c.arc(p.x - 3, p.y - 21, 4, 0, 7); c.fill();
    } else if (p.type === "sol") {
      c.fillStyle = "rgba(255,216,74,.35)"; c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.fill();
      c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(p.x, p.y, 8.5, 0, 7); c.fill();
    } else if (p.type === "krystal") {
      c.fillStyle = p.farve || "#b48cf0";
      c.beginPath(); c.moveTo(p.x, p.y - 6); c.lineTo(p.x + 2.2, p.y); c.lineTo(p.x - 2.2, p.y); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(p.x, p.y - 5); c.lineTo(p.x + .8, p.y - 1); c.lineTo(p.x - .2, p.y - 1); c.fill();
    }
  }

  // Ildfluer under jorden (rene pynt-lys, der bevæger sig blidt rundt)
  function ildfluer(t, ud) {
    return Array.from({ length: 10 }, (_, i) => ({
      x: ud.l + (ud.r - ud.l) * hash(i + 1) + (RM.matches ? 0 : Math.sin(t * .6 + i) * 6),
      y: ud.t + (ud.b - ud.t) * (.15 + .7 * hash(i + 20)) + (RM.matches ? 0 : Math.cos(t * .5 + i * 2) * 4),
    }));
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
    .rb-kort-pynt svg{position:absolute;overflow:visible}
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
    .rb-aebler{font-size:clamp(34px,6vh,56px);letter-spacing:.1em;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3))}
    .rb-aebler i{font-style:normal;opacity:.3;filter:grayscale(1)}
    .rb-hjemme .rb-row{display:flex;gap:20px;pointer-events:auto}
    .rb-videre{width:clamp(92px,14vh,130px);font-size:clamp(44px,7vh,64px);background:#5cc46b;color:#fff;box-shadow:0 7px 0 #3d8f4d;animation:rb-puls2 1.2s ease-in-out infinite}
    @keyframes rb-puls2{50%{transform:scale(1.08)}}
    @media (prefers-reduced-motion:reduce){.rb-boble.naeste,.rb-videre{animation:none}}
  `);

  let root, alive, timers, canvas, ctx, raf, last, acc, w, nr, forsoeg, sidstRoert, hjaelpFra, spor, traek, hjemmeT, gemt, ud, dybTest;
  let s = 1, ox = 0, oy = 0, cw = 0, ch = 0, dpr = 1;
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
      c.strokeStyle = "#7a5530"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(11, -1); c.lineTo(11, 7.5); c.stroke();
      c.strokeStyle = "#d9b27c"; c.lineWidth = .8; c.stroke();
      tegnPindsvin(c, { x: 11, y: 13, rot: -.35 }, 0, null);
    } else if (type === "kast") {
      if (tema === "under") { c.fillStyle = "#ffb347"; c.beginPath(); c.ellipse(11, 19.6, 9, 3.6, 0, Math.PI, 0); c.closePath(); c.fill(); }
      else {
        c.fillStyle = "#5fae47"; c.beginPath(); c.ellipse(11, 18.6, 9.5, 2.4, 0, 0, 7); c.fill();
        c.strokeStyle = "#3d7f3a"; c.lineWidth = .5; c.beginPath(); c.moveTo(3, 18.6); c.lineTo(19, 18.6); c.stroke();
      }
      tegnPindsvin(c, { x: 11, y: 12, rot: 0 }, 0, null);
    } else if (type === "hjemme") {
      c.translate(11, 12); c.scale(1.2, 1.2); c.translate(-11, -12);
      tegnPindsvin(c, { x: 10.2, y: 12.6, rot: 0 }, 0, 0);
    } else {
      c.translate(11, 12); c.scale(3, 3); c.translate(-11, -12);
      if (type === "aeble") tegnAeble(c, { x: 11, y: 12.6, taget: false }, 0, 0);
      else {
        // et æble, der ikke er fundet endnu: en lys skygge af et æble
        c.fillStyle = "rgba(255,255,255,.5)";
        c.beginPath(); c.arc(10, 12.6, 2.6, 0, 7); c.arc(12, 12.6, 2.6, 0, 7); c.fill();
        c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = .6; c.lineCap = "round";
        c.beginPath(); c.moveTo(11, 10.2); c.lineTo(11.4, 8.6); c.stroke();
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

  // Banekortets landskab bag boblerne: sol, skyer, træer og blomster på græsset; rødder, lysende svampe og krystaller under jorden
  function kortPynt(hoejde, graense) {
    const svg = (x, y, w, h, indhold, stil = "") => `<svg style="left:${x}%;top:${y}px;${stil}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${indhold}</svg>`;
    const ting = [];
    const himmel = Math.min(graense, hoejde);
    if (himmel > 200) {
      ting.push(svg(84, 26, 90, 90, `<circle cx="45" cy="45" r="44" fill="rgba(255,216,74,.35)"/><circle cx="45" cy="45" r="29" fill="#ffd84a"/>`, "margin-left:-45px"));
      for (let k = 0; 60 + k * 230 < himmel - 160; k++) {
        const x = k % 2 ? 70 + hash(k + 3) * 18 : 2 + hash(k + 5) * 16, sk = .7 + hash(k + 8) * .5;
        ting.push(svg(x, 150 + k * 230, 120, 50, `<g fill="#fff" opacity=".9" transform="scale(${sk})"><circle cx="30" cy="32" r="17"/><circle cx="58" cy="22" r="22"/><circle cx="88" cy="32" r="16"/><rect x="30" y="28" width="58" height="21" rx="10"/></g>`));
      }
    }
    if (graense < hoejde && graense > 120) {
      // på græsset (bunden af hver ting står på græskanten)
      const paaGraes = (x, w, h, indhold) => ting.push(svg(x, graense - 4 - h, w, h, indhold, `margin-left:-${w / 2}px`));
      const trae = `<rect x="31" y="55" width="8" height="45" fill="#8a5a32"/><circle cx="35" cy="40" r="30" fill="#5fae47"/><circle cx="25" cy="30" r="12" fill="#8fd16f"/>`;
      const busk = `<circle cx="18" cy="24" r="14" fill="#4f9e3c"/><circle cx="36" cy="20" r="18" fill="#5fae47"/><circle cx="52" cy="26" r="12" fill="#4f9e3c"/><rect x="6" y="26" width="58" height="12" fill="#5fae47"/>`;
      const blomst = f => `<path d="M10 30 V12" stroke="#3d7f3a" stroke-width="2"/>${[0, 1, 2, 3, 4].map(k => `<circle cx="${10 + Math.cos(k * 1.257) * 4.5}" cy="${11 + Math.sin(k * 1.257) * 4.5}" r="3.6" fill="${f}"/>`).join("")}<circle cx="10" cy="11" r="2.6" fill="#ffd84a"/>`;
      paaGraes(6, 70, 100, trae); paaGraes(93, 70, 100, trae); paaGraes(17, 70, 38, busk); paaGraes(80, 70, 38, busk);
      [[11, "#ff7fbf"], [24, "#b48cf0"], [73, "#ffd84a"], [87, "#ff7fbf"], [52, "#ffffff"]].forEach(([x, f]) => paaGraes(x, 20, 30, blomst(f)));
      // rødder fra græsset og ned
      [5, 16, 29, 41, 58, 71, 83, 95].forEach((x, k) => {
        const l = 40 + hash(k + 40) * 60, b = (hash(k + 50) - .5) * 24;
        ting.push(svg(x, graense + 2, 40, l + 4, `<path d="M20 0 Q${20 + b} ${l * .55} ${20 + b * .3} ${l}" stroke="#7a5236" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${20 + b * .45} ${l * .45} q8 4 10 14" stroke="#7a5236" stroke-width="3" fill="none" stroke-linecap="round"/>`, "margin-left:-20px"));
      });
      // lysende svampe og krystaller ude i siderne
      for (let k = 0, y = graense + 150; y < hoejde - 50; k++, y += 120) {
        const x = k % 2 ? 86 + hash(k + 60) * 8 : 6 + hash(k + 70) * 8; // midten af tingen; holdes inde på skærmen
        if (k % 3 === 2) {
          const f = ["#b48cf0", "#ff9fd0", "#7fe3ff"][k % 3 === 2 ? (k >> 1) % 3 : 0];
          ting.push(svg(x, y, 30, 40, `<path d="M15 2 L23 38 H7 Z" fill="${f}"/><path d="M15 8 L18 34 H14 Z" fill="rgba(255,255,255,.5)"/><path d="M5 18 L10 38 H1 Z" fill="${f}" opacity=".8"/>`, `margin-left:-15px;filter:drop-shadow(0 0 7px ${f})`));
        } else {
          ting.push(svg(x, y, 44, 40, `<rect x="19" y="18" width="6" height="22" rx="2" fill="#e9e3d6"/><path d="M4 20 Q22 -4 40 20 Z" fill="#7fe3ff"/><circle cx="15" cy="13" r="2" fill="rgba(255,255,255,.7)"/><circle cx="27" cy="10" r="2.4" fill="rgba(255,255,255,.7)"/>`, "margin-left:-22px;filter:drop-shadow(0 0 9px rgba(120,230,255,.85))"));
        }
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
    el.innerHTML = `${af ? `<div class="rb-aebler">${Array.from({ length: af }, (_, k) => k < fik ? "🍎" : "<i>🍎</i>").join("")}</div>` : ""}
      <div class="rb-row"><button class="rb-knap rb-videre" aria-label="Næste bane">▶</button></div>`;
    el.hidden = false;
    el.querySelector(".rb-videre").onclick = () => { Spil.sfx.click(); naesteBane(); };
    later(() => { if (w && w.status === "hjemme" && !q(".rb-hjemme").hidden) naesteBane(); }, 9000);
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
    const dt = Math.min(.05, (nu - last) / 1000 || 0); last = nu;
    if (w && w.status === "spil") {
      acc += dt;
      while (acc >= H) { trin(w); acc -= H; if (w.status !== "spil") break; }
      for (const h of w.haendelser.splice(0)) {
        if (h === "boing") { lyd("boing"); w.trampoliner.forEach(t => t._puls = nu / 1000); }
        else if (h === "aeble") { lyd("aeble"); const sp = tilSkaerm(w.ball.x, w.ball.y); Spil.burst(sp[0], sp[1], "🍎✨"); }
        else if (h === "bump") lyd("bump");
        else if (h === "hov") hov();
        else if (h === "hjemme") hjemme();
      }
      // Hjælp, hvis der ikke er rørt ved noget i et stykke tid
      if (!hjaelpFra && nu - sidstRoert > 8000) hjaelpFra = nu;
    } else acc = 0;
    if (hjemmeT != null) hjemmeT += dt;
    if (w) ballonerFlyver(w, dt, nu / 1000);
    tegn(nu / 1000);
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
    w.jord.forEach(e => tegnJord(c, w, e, ud));
    if (w.tema === "under") w.jord.forEach(e => e.fyld === "op" && !e.skjult && tegnRoedder(c, w, e, ud));
    w.planker.forEach(e => tegnPlanke(c, w, e));
    w.aebler.forEach((a, i) => tegnAeble(c, a, t, i));
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
      alive = true; timers = []; acc = 0; last = performance.now(); gemt = hent(); w = null; nr = -1; forsoeg = 0; hjaelpFra = null; spor = []; traek = null; hjemmeT = null;
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
