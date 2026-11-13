// Spil: Vippetårnet — byg med træklodser på en stor vippe, med rigtig 2D-fysik (2–5 år).
// Barnet trækker træklodser fra bakken ud på scenen. De stables og vælter som rigtige klodser,
// og vippen i midten tipper efter vægt × afstand. Er den ene side tung, kan barnet redde tårnet
// ved at lægge noget på den anden side. Et kort tryk på en klods drejer den 90° med et lille hop.
// Ingen tabe-tilstand: væltede tårne lander blødt, stemmen griner det væk, og 🧹 rydder op.
//
// Fysikken er en lille motor her i filen: konvekse polygoner og cirkler, fast tidsskridt (1/120 s),
// impulsløser med flere iterationer, "warm starting", Baumgarte-positionskorrektion og søvn for
// bunker, der ligger stille. Vippens bom kan kun dreje (uendelig masse til flytning). Den er ærlig:
// ingen skjult fjeder retter den op. Den drejer efter det samlede moment (masse × arm om bolten), til
// den hviler på sine stop. Der er kun lidt dæmpning og en lille gnidning i bolten, der vokser med lasten
// (som på en rigtig vippe), så en vippe i balance bliver stående. Enheder: 1 = ca. en klodsbredde
// (y peger op, gulvet er y = 0).
(function () {
  /* ================= Konstanter ================= */
  const H = 1 / 120;            // tidsskridt
  const ITER = 10;              // løser-iterationer pr. skridt
  const G = 22;                 // tyngdekraft (enheder/s²) — legetøjsklodser i "kæmpe-skala", så faldet kan ses
  const BETA = 0.2, SLOP = 0.008, SPEC = 0.03; // positionskorrektion, tilladt overlap, spekulativ margen
  const SLEEP_V = 0.06, SLEEP_W = 0.06, SLEEP_T = 0.5;
  const VIP_DAMP = 4;           // vippens dæmpning (pr. sekund): den tipper roligt, men tydeligt
  const VIP_GNID = 0.12;        // gnidning i bolten: højst 0,12 × lasten i moment — ca. 5 % af momentet yderst på bommen
  const LIGE_GRAENSE = 0.10;    // i balance: |summen af momenter| < 10 % af summen af |momenter|
  const LIGE_TID = 1.5;         // ... og bommen næsten vandret og i ro så længe (s)
  const VIP_MAX = 15 * Math.PI / 180;
  const BOM_T = 0.36;           // bommens tykkelse
  const MAX_KROPPE = 40;
  const ZOOM_MIN = 0.55;        // kameraet zoomer højst så langt ud, så klodserne stadig er store nok at tage fat i

  const RM = matchMedia("(prefers-reduced-motion: reduce)");

  /* ================= Små vektor-hjælpere ================= */
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ================= Former ================= */
  // Polygon: hjørner mod uret, flyttes så tyngdepunktet ligger i (0,0). Returnerer masse-egenskaber pr. densitet.
  function poly(pts) {
    let A = 0, cx = 0, cy = 0, I = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], c = cross(p[0], p[1], q[0], q[1]);
      A += c / 2; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c;
    }
    cx /= 6 * A; cy /= 6 * A;
    const v = pts.map(p => [p[0] - cx, p[1] - cy]);
    for (let i = 0; i < v.length; i++) {
      const p = v[i], q = v[(i + 1) % v.length], c = cross(p[0], p[1], q[0], q[1]);
      I += c * (p[0] * p[0] + p[0] * q[0] + q[0] * q[0] + p[1] * p[1] + p[1] * q[1] + q[1] * q[1]);
    }
    I /= 12;
    const n = v.map((p, i) => { const q = v[(i + 1) % v.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l]; });
    const r = Math.max(...v.map(p => Math.hypot(p[0], p[1])));
    return { type: "p", v, n, A, I, r };
  }
  const boks = (w, h) => poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
  const cirkel = r => ({ type: "c", r, A: Math.PI * r * r, I: Math.PI * r * r * r * r / 2 });
  function halvcirkel(r, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
    return poly(pts); // går fra (r,0) over toppen til (-r,0): mod uret
  }

  /* ================= Klodser ================= */
  // farve, lys kant og mørk kant. Densitet 0.35: en kube vejer ca. 0.46.
  const KLODSER = [
    { id: "kube", form: () => boks(1.15, 1.15), farve: "#ef6f6c", lys: "#ffa7a3", moerk: "#b8403e", tone: 1 },
    { id: "planke", form: () => boks(2.6, 0.62), farve: "#ffc93c", lys: "#ffe49a", moerk: "#c9961a", tone: 0.8 },
    { id: "lille", form: () => boks(0.82, 0.82), farve: "#7bc96f", lys: "#b6e8ab", moerk: "#4a9441", tone: 1.35 },
    { id: "tag", form: () => poly([[-0.8, 0], [0.8, 0], [0, 0.9]]), farve: "#5aa9e6", lys: "#a6d3f5", moerk: "#2f78b3", tone: 1.15 },
    { id: "bue", form: () => halvcirkel(0.78, 12), farve: "#ff9f43", lys: "#ffcf9c", moerk: "#c76d16", tone: 0.95 },
    { id: "rulle", form: () => cirkel(0.5), farve: "#b48ee0", lys: "#dbc7f5", moerk: "#7d58ad", tone: 1.2 },
  ];
  const DENS = 0.35;

  /* ================= Fysikmotoren ================= */
  function lavVerden() {
    const W = { bodies: [], mf: new Map(), nid: 1, impacts: [], dragJ: null, statik: [], cfg: { warm: true, beta: BETA } };

    W.add = function (shape, x, y, a, o = {}) {
      const b = { id: W.nid++, s: shape, x, y, a, vx: 0, vy: 0, w: 0, still: 0, sleep: false,
        mu: o.mu ?? 0.6, e: o.e ?? 0.08, kind: o.kind || "", data: o.data || null, ld: o.ld ?? 0.02, ad: o.ad ?? 0.08,
        noGrav: false, ghost: false, edge: !!o.edge };
      if (o.static) { b.m = 0; b.invM = 0; b.invI = 0; }
      else {
        const m = o.m ?? shape.A * (o.dens ?? DENS); b.m = m; b.invM = o.pin ? 0 : 1 / m;
        b.I = shape.I * m / shape.A; b.invI = 1 / b.I;
      }
      b.wv = shape.type === "p" ? shape.v.map(() => [0, 0]) : null;
      b.wn = shape.type === "p" ? shape.n.map(() => [0, 0]) : null;
      b.aabb = [0, 0, 0, 0];
      xf(b);
      W.bodies.push(b);
      return b;
    };
    W.remove = function (b) {
      const i = W.bodies.indexOf(b); if (i >= 0) W.bodies.splice(i, 1);
      for (const [k, m] of W.mf) if (m.A === b || m.B === b) W.mf.delete(k);
      if (W.dragJ && W.dragJ.b === b) W.dragJ = null;
    };
    W.wake = b => { if (b.sleep) { b.sleep = false; b.still = 0; } };
    const isStatic = b => b.invM === 0 && b.invI === 0;

    // Opdater verdens-hjørner, normaler og AABB
    function xf(b) {
      const c = Math.cos(b.a), s = Math.sin(b.a), sh = b.s;
      if (sh.type === "p") {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let i = 0; i < sh.v.length; i++) {
          const p = sh.v[i], q = b.wv[i], vx = b.x + c * p[0] - s * p[1], vy = b.y + s * p[0] + c * p[1];
          q[0] = vx; q[1] = vy;
          if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
          const n = sh.n[i], wn = b.wn[i]; wn[0] = c * n[0] - s * n[1]; wn[1] = s * n[0] + c * n[1];
        }
        b.aabb[0] = x0; b.aabb[1] = y0; b.aabb[2] = x1; b.aabb[3] = y1;
      } else {
        b.aabb[0] = b.x - sh.r; b.aabb[1] = b.y - sh.r; b.aabb[2] = b.x + sh.r; b.aabb[3] = b.y + sh.r;
      }
    }
    W.xf = xf;

    /* ---------- Kollision ---------- */
    // Største adskillelse af B's hjørner langs A's kanter
    function maxSep(A, B) {
      let best = -1e9, bi = 0;
      for (let i = 0; i < A.wv.length; i++) {
        const n = A.wn[i], v = A.wv[i];
        let mn = 1e9;
        for (let j = 0; j < B.wv.length; j++) { const d = n[0] * (B.wv[j][0] - v[0]) + n[1] * (B.wv[j][1] - v[1]); if (d < mn) mn = d; }
        if (mn > best) { best = mn; bi = i; }
      }
      return [best, bi];
    }
    function polyPoly(A, B, out) {
      const [sa, ia] = maxSep(A, B); if (sa > SPEC) return;
      const [sb, ib] = maxSep(B, A); if (sb > SPEC) return;
      let R, I, ri, flip;
      if (sb > sa + 0.005) { R = B; I = A; ri = ib; flip = true; } else { R = A; I = B; ri = ia; flip = false; }
      const n = R.wn[ri], nv = R.wv.length;
      // Indfaldende kant: den med normal mest modsat referencenormalen
      let ii = 0, mn = 1e9;
      for (let j = 0; j < I.wn.length; j++) { const d = n[0] * I.wn[j][0] + n[1] * I.wn[j][1]; if (d < mn) { mn = d; ii = j; } }
      const i2 = (ii + 1) % I.wv.length;
      let p1 = [I.wv[ii][0], I.wv[ii][1], ii], p2 = [I.wv[i2][0], I.wv[i2][1], i2];
      const v1 = R.wv[ri], v2 = R.wv[(ri + 1) % nv];
      const tx = v2[0] - v1[0], ty = v2[1] - v1[1], tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl;
      // Klip mod referencekantens to sider
      const clip = (a, b, ox, oy, nx, ny) => {
        const da = nx * (a[0] - ox) + ny * (a[1] - oy), db = nx * (b[0] - ox) + ny * (b[1] - oy);
        const r = [];
        if (da <= 0) r.push(a); if (db <= 0) r.push(b);
        if (da * db < 0) { const t = da / (da - db); r.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), da > 0 ? a[2] : b[2]]); }
        return r;
      };
      let cp = clip(p1, p2, v1[0], v1[1], -ux, -uy); if (cp.length < 2) return;
      cp = clip(cp[0], cp[1], v2[0], v2[1], ux, uy); if (cp.length < 2) return;
      const nx = flip ? -n[0] : n[0], ny = flip ? -n[1] : n[1];
      for (const p of cp) {
        const sep = n[0] * (p[0] - v1[0]) + n[1] * (p[1] - v1[1]);
        if (sep <= SPEC) out.push({ x: p[0] - n[0] * sep / 2, y: p[1] - n[1] * sep / 2, nx, ny, sep, id: (flip ? 1000 : 0) + ri * 32 + p[2] });
      }
    }
    // Polygon A mod cirkel B (normal fra A mod B)
    function polyCirc(A, B, out, swap) {
      const r = B.s.r, cx = B.x, cy = B.y;
      let best = -1e9, bi = 0;
      for (let i = 0; i < A.wv.length; i++) { const s = A.wn[i][0] * (cx - A.wv[i][0]) + A.wn[i][1] * (cy - A.wv[i][1]); if (s > best) { best = s; bi = i; } }
      if (best > r + SPEC) return;
      const v1 = A.wv[bi], v2 = A.wv[(bi + 1) % A.wv.length];
      const u1 = (cx - v1[0]) * (v2[0] - v1[0]) + (cy - v1[1]) * (v2[1] - v1[1]);
      const u2 = (cx - v2[0]) * (v1[0] - v2[0]) + (cy - v2[1]) * (v1[1] - v2[1]);
      let nx, ny, sep, id = bi;
      if (best > 0 && (u1 <= 0 || u2 <= 0)) { // hjørne-område
        const v = u1 <= 0 ? v1 : v2, dx = cx - v[0], dy = cy - v[1], d = Math.hypot(dx, dy);
        if (d > r + SPEC || d < 1e-9) return;
        nx = dx / d; ny = dy / d; sep = d - r; id = 100 + (u1 <= 0 ? bi : (bi + 1) % A.wv.length);
      } else { nx = A.wn[bi][0]; ny = A.wn[bi][1]; sep = best - r; }
      const px = cx - nx * (r + sep / 2), py = cy - ny * (r + sep / 2);
      out.push(swap ? { x: px, y: py, nx: -nx, ny: -ny, sep, id } : { x: px, y: py, nx, ny, sep, id });
    }
    function circCirc(A, B, out) {
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), r = A.s.r + B.s.r;
      if (d > r + SPEC || d < 1e-9) return;
      const nx = dx / d, ny = dy / d, sep = d - r;
      out.push({ x: A.x + nx * (A.s.r + sep / 2), y: A.y + ny * (A.s.r + sep / 2), nx, ny, sep, id: 0 });
    }
    function collide(A, B) {
      const out = [];
      if (A.s.type === "p" && B.s.type === "p") polyPoly(A, B, out);
      else if (A.s.type === "p") polyCirc(A, B, out, false);
      else if (B.s.type === "p") polyCirc(B, A, out, true);
      else circCirc(A, B, out);
      return out;
    }

    // Hvilke par må kollidere?
    W.filter = (A, B) => true;
    // Overlapper b noget som helst? (bruges når en ny klods fra bakken slippes)
    W.overlap = function (b, dyb = 0.02) {
      for (const o of W.bodies) {
        if (o === b || o.flyv) continue;
        if (o.aabb[0] > b.aabb[2] || b.aabb[0] > o.aabb[2] || o.aabb[1] > b.aabb[3] || b.aabb[1] > o.aabb[3]) continue;
        const [P, Q] = o.id < b.id ? [o, b] : [b, o];
        if (collide(P, Q).some(c => c.sep < -dyb)) return o;
      }
      return null;
    };

    /* ---------- Et tidsskridt ---------- */
    W.step = function (h) {
      const bs = W.bodies, inv = 1 / h, J = W.dragJ;
      W.impacts.length = 0;
      // 1) Hastigheder: tyngde, vippens fjeder, dæmpning
      for (const b of bs) {
        if (isStatic(b) || b.sleep) continue;
        if (!b.noGrav && b.invM > 0) b.vy -= G * h;

        b.vx /= 1 + h * b.ld; b.vy /= 1 + h * b.ld; b.w /= 1 + h * b.ad;
        if (b.holdA !== undefined) b.w = clamp((b.holdA - b.a) * 14, -9, 9);
      }
      // 2) Kollisioner (sweep-and-prune på x)
      const list = bs.slice().sort((p, q) => p.aabb[0] - q.aabb[0]);
      const seen = new Set();
      for (let i = 0; i < list.length; i++) {
        const A = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const B = list[j];
          if (B.aabb[0] > A.aabb[2] + SPEC) break;
          if (B.aabb[1] > A.aabb[3] + SPEC || A.aabb[1] > B.aabb[3] + SPEC) continue;
          const sa = isStatic(A), sb = isStatic(B);
          if ((sa || A.sleep) && (sb || B.sleep)) {
            // hold gamle kontakter mellem sovende kroppe i live, så de kan vækkes med warm start
            const k0 = A.id < B.id ? A.id + ":" + B.id : B.id + ":" + A.id; if (W.mf.has(k0)) seen.add(k0);
            continue;
          }
          if (A.invM === 0 && B.invM === 0 && (sa || sb)) continue; // vippe mod statisk
          if (!W.filter(A, B)) continue;
          const [P, Q] = A.id < B.id ? [A, B] : [B, A];
          const pts = collide(P, Q);
          const key = P.id + ":" + Q.id;
          if (!pts.length) continue;
          // vågent rører sovende → væk det
          if (P.sleep) W.wake(P); if (Q.sleep) W.wake(Q);
          const old = W.mf.get(key);
          const m = { A: P, B: Q, pts, mu: Math.sqrt(P.mu * Q.mu), e: Math.max(P.e, Q.e) };
          for (const c of pts) {
            c.pn = 0; c.pt = 0;
            if (old) { const o = old.pts.find(q => q.id === c.id); if (o) { if (W.cfg.warm) { c.pn = o.pn; c.pt = W.cfg.warmT === false ? 0 : o.pt; } c.old = true; } }
          }
          W.mf.set(key, m); seen.add(key);
        }
      }
      for (const k of W.mf.keys()) if (!seen.has(k)) W.mf.delete(k);

      // 3) Forberedelse + warm start
      const act = [];
      for (const m of W.mf.values()) {
        const A = m.A, B = m.B;
        if ((isStatic(A) || A.sleep) && (isStatic(B) || B.sleep)) continue;
        act.push(m);
        for (const c of m.pts) {
          const rax = c.x - A.x, ray = c.y - A.y, rbx = c.x - B.x, rby = c.y - B.y;
          c.rax = rax; c.ray = ray; c.rbx = rbx; c.rby = rby;
          const rnA = cross(rax, ray, c.nx, c.ny), rnB = cross(rbx, rby, c.nx, c.ny);
          c.mn = 1 / (A.invM + B.invM + A.invI * rnA * rnA + B.invI * rnB * rnB);
          const tx = c.ny, ty = -c.nx;
          const rtA = cross(rax, ray, tx, ty), rtB = cross(rbx, rby, tx, ty);
          c.mt = 1 / (A.invM + B.invM + A.invI * rtA * rtA + B.invI * rtB * rtB);
          // Hastighed ind i kontakten FØR warm start (ellers ligner hvilende stakke et stød)
          const dvx = B.vx - B.w * rby - A.vx + A.w * ray, dvy = B.vy + B.w * rbx - A.vy - A.w * rax;
          const vn = dvx * c.nx + dvy * c.ny;
          c.bias = c.sep > 0 ? -c.sep * inv : W.cfg.beta * inv * Math.max(0, -c.sep - SLOP);
          if (vn < -1.2) { c.bias = Math.max(c.bias, -m.e * vn); }
          if (vn < -0.9 && !c.old) W.impacts.push({ A, B, v: -vn, x: c.x, y: c.y });
        }
      }
      // Gnidning i bolten: et moment, der højst er gnid × lasten på bommen (lasten = kontakternes
      // normal-impulser fra sidste skridt). Det er en rigtig gnidning — den kan kun bremse, aldrig rette op.
      const gnid = [];
      for (const b of bs) if (b.gnid && !b.sleep) gnid.push({ b, last: 0, acc: 0 });
      if (gnid.length) for (const m of act) for (const F of gnid) if (m.A === F.b || m.B === F.b) for (const c of m.pts) F.last += c.pn;
      for (const F of gnid) F.max = F.b.gnid * F.last;
      // warm start (gem impulserne fra sidste skridt)
      for (const m of act) {
        const A = m.A, B = m.B;
        for (const c of m.pts) {
          const tx = c.ny, ty = -c.nx;
          const px = c.pn * c.nx + c.pt * tx, py = c.pn * c.ny + c.pt * ty;
          A.vx -= A.invM * px; A.vy -= A.invM * py; A.w -= A.invI * cross(c.rax, c.ray, px, py);
          B.vx += B.invM * px; B.vy += B.invM * py; B.w += B.invI * cross(c.rbx, c.rby, px, py);
        }
      }
      // Trækkeleddet (blød fjeder mod fingeren)
      if (J && J.b.sleep) W.wake(J.b);
      if (J) {
        const b = J.b, c = Math.cos(b.a), s = Math.sin(b.a);
        J.rx = c * J.lx - s * J.ly; J.ry = s * J.lx + c * J.ly;
        const om = 2 * Math.PI * J.f, k = J.m * om * om, d = 2 * J.m * J.z * om;
        const gam = 1 / (h * (d + h * k)); J.gam = gam;
        const beta = h * k * gam;
        const k11 = b.invM + b.invI * J.ry * J.ry + gam, k12 = -b.invI * J.rx * J.ry, k22 = b.invM + b.invI * J.rx * J.rx + gam;
        const det = k11 * k22 - k12 * k12;
        J.K = [k22 / det, -k12 / det, k11 / det];
        J.cx = (b.x + J.rx - J.tx) * beta; J.cy = (b.y + J.ry - J.ty) * beta;
        J.maxI = J.maxF * h;
        J.ix *= 0.9; J.iy *= 0.9;
        b.vx += b.invM * J.ix; b.vy += b.invM * J.iy; b.w += b.invI * cross(J.rx, J.ry, J.ix, J.iy);
      }
      // Vippens stop (en-sidet vinkelgrænse). sd = -1: øvre grænse (w skal ned), sd = 1: nedre grænse
      const lim = [];
      for (const b of bs) if (b.limit && !b.sleep) {
        if (b.a > b.limit - 0.03) lim.push({ b, sd: -1, gap: b.limit - b.a, acc: 0 });
        else if (b.a < -b.limit + 0.03) lim.push({ b, sd: 1, gap: b.a + b.limit, acc: 0 });
      }
      for (const Lm of lim) { const vc = Lm.sd * Lm.b.w; if (vc < -0.4 && Lm.gap < 0.02) W.impacts.push({ A: Lm.b, B: Lm.b, v: -vc * 3, stop: true }); }

      // 4) Iterationer
      for (let it = 0; it < (W.cfg.iter || ITER); it++) {
        for (const F of gnid) {
          const b = F.b, o = F.acc;
          F.acc = clamp(o - b.w / b.invI, -F.max, F.max);
          b.w += (F.acc - o) * b.invI;
        }
        if (J) {
          const b = J.b;
          const vx = b.vx - b.w * J.ry, vy = b.vy + b.w * J.rx;
          const bx = -(vx + J.cx + J.gam * J.ix), by = -(vy + J.cy + J.gam * J.iy);
          let ix = J.K[0] * bx + J.K[1] * by, iy = J.K[1] * bx + J.K[2] * by;
          const ox = J.ix, oy = J.iy; J.ix += ix; J.iy += iy;
          const l = Math.hypot(J.ix, J.iy); if (l > J.maxI) { J.ix *= J.maxI / l; J.iy *= J.maxI / l; }
          ix = J.ix - ox; iy = J.iy - oy;
          b.vx += b.invM * ix; b.vy += b.invM * iy; b.w += b.invI * cross(J.rx, J.ry, ix, iy);
        }
        for (const Lm of lim) {
          const b = Lm.b, vc = Lm.sd * b.w;
          const maal = Lm.gap > 0 ? -Lm.gap * inv : BETA * inv * -Lm.gap;
          let lam = (maal - vc) / b.invI;
          const o = Lm.acc; Lm.acc = Math.max(0, o + lam); lam = Lm.acc - o;
          b.w += Lm.sd * lam * b.invI;
        }
        for (let mi = 0; mi < act.length; mi++) {
          const m = act[mi], A = m.A, B = m.B;
          for (const c of m.pts) {
            const tx = c.ny, ty = -c.nx;
            let dvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray, dvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
            // friktion
            const vt = dvx * tx + dvy * ty;
            let dpt = -vt * c.mt;
            const mx = m.mu * c.pn, ot = c.pt; c.pt = clamp(ot + dpt, -mx, mx); dpt = c.pt - ot;
            let px = dpt * tx, py = dpt * ty;
            A.vx -= A.invM * px; A.vy -= A.invM * py; A.w -= A.invI * cross(c.rax, c.ray, px, py);
            B.vx += B.invM * px; B.vy += B.invM * py; B.w += B.invI * cross(c.rbx, c.rby, px, py);
            // normal
            dvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray; dvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
            const vn = dvx * c.nx + dvy * c.ny;
            let dpn = c.mn * (-vn + c.bias);
            const on = c.pn; c.pn = Math.max(on + dpn, 0); dpn = c.pn - on;
            px = dpn * c.nx; py = dpn * c.ny;
            A.vx -= A.invM * px; A.vy -= A.invM * py; A.w -= A.invI * cross(c.rax, c.ray, px, py);
            B.vx += B.invM * px; B.vy += B.invM * py; B.w += B.invI * cross(c.rbx, c.rby, px, py);
          }
        }
      }
      // Gnidningen i bolten kan ikke holde igen (vippen er ude af balance): så må den ikke falde i søvn
      for (const F of gnid) F.b.glider = Math.abs(F.acc) >= F.max * 0.999 && F.last > 1e-9;
      // 5) Positioner
      for (const b of bs) {
        if (isStatic(b) || b.sleep) continue;
        const v2 = b.vx * b.vx + b.vy * b.vy; if (v2 > 400) { const f = 20 / Math.sqrt(v2); b.vx *= f; b.vy *= f; }
        b.x += b.vx * h; b.y += b.vy * h; b.a += b.w * h;
        xf(b);
      }
      // 6) Søvn: øer af kroppe der rører hinanden falder i søvn sammen
      if (!W.ingenSoevn) sleepIslands(h);
    };

    function sleepIslands(h) {
      const bs = W.bodies, par = new Map();
      const find = b => { let r = b; while (par.get(r) !== r) r = par.get(r); let c = b; while (par.get(c) !== r) { const n = par.get(c); par.set(c, r); c = n; } return r; };
      for (const b of bs) {
        if (isStatic(b) || b.sleep) continue;
        par.set(b, b);
        const lin = b.vx * b.vx + b.vy * b.vy, ang = b.w * b.w;
        const hold = (W.dragJ && W.dragJ.b === b) || b.noSleep || b.glider;

        if (!hold && lin < SLEEP_V * SLEEP_V && ang < SLEEP_W * SLEEP_W) b.still += h; else b.still = 0;
      }
      for (const m of W.mf.values()) {
        if (!par.has(m.A) || !par.has(m.B)) continue;
        const ra = find(m.A), rb = find(m.B); if (ra !== rb) par.set(ra, rb);
      }
      const minT = new Map();
      for (const b of par.keys()) { const r = find(b); minT.set(r, Math.min(minT.get(r) ?? 1e9, b.still)); }
      for (const b of par.keys()) if (minT.get(find(b)) > SLEEP_T) { b.sleep = true; b.vx = b.vy = b.w = 0; }
    }

    // Kroppe der rører en given krop (via kontakter)
    W.naboer = function (b) {
      const r = [];
      for (const m of W.mf.values()) { if (m.A === b) r.push(m.B); else if (m.B === b) r.push(m.A); }
      return r;
    };
    return W;
  }

  /* ================= Træklods-tegning (forudtegnede sprites) ================= */
  function sti(ctx, sh, ppm) {
    ctx.beginPath();
    if (sh.type === "c") ctx.arc(0, 0, sh.r * ppm, 0, Math.PI * 2);
    else sh.v.forEach((p, i) => i ? ctx.lineTo(p[0] * ppm, -p[1] * ppm) : ctx.moveTo(p[0] * ppm, -p[1] * ppm));
    ctx.closePath();
  }
  function tegnKlods(type, sh, ppm, dpr) {
    const ext = (sh.type === "c" ? sh.r : sh.r) * ppm + 6;
    const cv = document.createElement("canvas"); cv.width = cv.height = Math.ceil(ext * 2 * dpr);
    const c = cv.getContext("2d"); c.scale(dpr, dpr); c.translate(ext, ext);
    c.lineJoin = "round";
    // grundfarve med let skær
    sti(c, sh, ppm);
    const g = c.createLinearGradient(-ext * .7, -ext * .7, ext * .7, ext * .7);
    g.addColorStop(0, type.lys); g.addColorStop(.35, type.farve); g.addColorStop(1, type.farve);
    c.fillStyle = g; c.fill();
    // træårer
    c.save(); sti(c, sh, ppm); c.clip();
    c.strokeStyle = "rgba(90,50,10,.13)"; c.lineWidth = Math.max(1, ppm * .018);
    for (let i = -4; i <= 4; i++) {
      c.beginPath();
      const y0 = i * ppm * .17;
      for (let x = -ext; x <= ext; x += 6) c.lineTo(x, y0 + Math.sin(x * .045 + i * 1.7) * ppm * .03);
      c.stroke();
    }
    if (type.id === "rulle") { // årringe på enden af rullen
      c.strokeStyle = "rgba(90,50,10,.16)";
      for (let r = .14; r < .5; r += .12) { c.beginPath(); c.arc(0, 0, r * ppm, 0, 7); c.stroke(); }
    }
    c.restore();
    // kant
    sti(c, sh, ppm);
    c.lineWidth = Math.max(2.5, ppm * .045); c.strokeStyle = type.moerk; c.stroke();
    // lys kant øverst inde i klodsen
    c.save(); sti(c, sh, ppm); c.clip();
    c.translate(-ppm * .05, ppm * .05);
    sti(c, sh, ppm); c.lineWidth = ppm * .07; c.strokeStyle = "rgba(255,255,255,.35)"; c.stroke();
    c.restore();
    return { cv, ext };
  }

  /* ================= CSS ================= */
  Spil.css("css-vippetaarn", `
    .vip{position:absolute;inset:0;overflow:hidden;touch-action:none;background:#fbf1dc}
    .vip canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
    .vip-knap{position:absolute;z-index:12;top:calc(2vh + env(safe-area-inset-top,0px));
      width:clamp(56px,8.5vh,78px);aspect-ratio:1;border-radius:50%;background:var(--card);
      box-shadow:0 6px 0 rgba(31,58,95,.25);font-size:clamp(26px,4.2vh,38px);display:flex;align-items:center;justify-content:center;padding:0}
    .vip-knap:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    .vip-ryd{right:max(14px,env(safe-area-inset-right,0px))}
    .vip-sig{right:calc(max(14px,env(safe-area-inset-right,0px)) + clamp(56px,8.5vh,78px) + 14px);background:var(--sun);box-shadow:0 6px 0 #d9a21a}
    .vip-sig:active{box-shadow:0 2px 0 #d9a21a}
    .vip-ryd.vip-fej{animation:vip-fej .6s ease-in-out}
    @keyframes vip-fej{30%{transform:rotate(-25deg)}70%{transform:rotate(25deg)}}
    @media (prefers-reduced-motion:reduce){.vip-ryd.vip-fej{animation:none}}
  `);

  /* ================= Spillet ================= */
  let root, cv, ctx, alive, timers, raf, W, L, beam, sprites, flyers, sweep;
  let lastT, acc, pointer, frameMs, ui, goal, stats, lyd, efterslip, zoom = 1;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

  /* ---------- Lyd (synth) ---------- */
  function lavLyd() {
    let a; try { a = Spil.audio(); } catch (e) { return null; }
    const master = a.createGain(); master.gain.value = 0.9; master.connect(a.destination);
    const n = a.sampleRate, nb = a.createBuffer(1, n, n), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // Knirke-lyd: uregelmæssige små "tik", hver en dæmpet resonans — som træ der gnider mod træ
    const kn = a.createBuffer(1, n * 2, n), kd = kn.getChannelData(0);
    let t = 0;
    while (t < n * 2 - 2000) {
      const f = 520 + Math.random() * 380, amp = .4 + Math.random() * .6, len = 900;
      for (let i = 0; i < len && t + i < kd.length; i++) kd[t + i] += Math.sin(i / n * f * 6.283) * Math.exp(-i / 160) * amp;
      t += (n / (28 + 30 * (0.5 + 0.5 * Math.sin(t / n * 9)))) * (0.6 + Math.random() * 0.8) | 0;
    }
    return { a, master, nb, kn, sidst: 0, aktive: 0, knirk: null };
  }
  function klonk(styrke, tone) {
    if (!lyd) return;
    const { a, master, nb } = lyd, t = a.currentTime;
    if (t - lyd.sidst < 0.025) return; lyd.sidst = t;
    const s = clamp(styrke, 0, 1), vol = 0.05 + 0.5 * s;
    // træ: en kort tone med hurtigt fald + et lille klik af støj
    const f0 = (430 + Math.random() * 60) * tone;
    const o = a.createOscillator(), g = a.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .82, t + .07);
    const dec = .07 + .06 * s;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
    o.connect(g).connect(master); o.start(t); o.stop(t + dec + .02);
    const o2 = a.createOscillator(), g2 = a.createGain();
    o2.frequency.value = f0 * 2.7; g2.gain.setValueAtTime(vol * .25, t); g2.gain.exponentialRampToValueAtTime(.0001, t + .035);
    o2.connect(g2).connect(master); o2.start(t); o2.stop(t + .05);
    const src = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain();
    src.buffer = nb; bp.type = "bandpass"; bp.frequency.value = 2400 * tone; bp.Q.value = 1.2;
    gn.gain.setValueAtTime(vol * .5, t); gn.gain.exponentialRampToValueAtTime(.0001, t + .025);
    src.connect(bp).connect(gn).connect(master); src.start(t, Math.random() * .8, .04);
  }
  function knirk(fart) {
    if (!lyd) return;
    const { a, master } = lyd;
    if (!lyd.knirk) {
      if (fart < 0.04) return;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = lyd.kn; src.loop = true; f.type = "bandpass"; f.frequency.value = 800; f.Q.value = 2;
      g.gain.value = 0; src.connect(f).connect(g).connect(master); src.start();
      lyd.knirk = { src, g, f };
    }
    const k = lyd.knirk, t = a.currentTime;
    const mal = fart < 0.03 ? 0 : clamp((fart - 0.03) * 0.4, 0, 0.07);
    k.g.gain.setTargetAtTime(mal, t, 0.08);
    k.src.playbackRate.setTargetAtTime(0.7 + clamp(fart * 3, 0, 1.5) * 0.4, t, 0.1);
  }
  function klokke() {
    if (!lyd) return;
    const { a, master } = lyd, t0 = a.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => {
      const t = t0 + i * 0.11;
      [[1, .22], [2.76, .05], [5.4, .02]].forEach(([m, v]) => {
        const o = a.createOscillator(), g = a.createGain();
        o.frequency.value = f * m; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + 1.4 / m);
        o.connect(g).connect(master); o.start(t); o.stop(t + 1.5);
      });
    });
  }
  function bum() {
    if (!lyd) return;
    const { a, master, nb } = lyd, t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .35);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
    o.connect(g).connect(master); o.start(t); o.stop(t + .5);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain();
    s.buffer = nb; f.type = "lowpass"; f.frequency.value = 700;
    gn.gain.setValueAtTime(.35, t); gn.gain.exponentialRampToValueAtTime(.0001, t + .3);
    s.connect(f).connect(gn).connect(master); s.start(t, 0, .35);
  }
  function sus(sek) { // fejekost-sus
    if (!lyd) return;
    const { a, master, nb } = lyd, t = a.currentTime;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = nb; s.loop = true; f.type = "bandpass"; f.Q.value = 1.5;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2200, t + sek);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + sek * .3); g.gain.exponentialRampToValueAtTime(.0001, t + sek);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + sek + .05);
  }
  function tok(op) { // samle op / slippe
    if (!lyd) return;
    const { a, master } = lyd, t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(op ? 420 : 620, t); o.frequency.exponentialRampToValueAtTime(op ? 680 : 380, t + .08);
    g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    o.connect(g).connect(master); o.start(t); o.stop(t + .14);
  }

  /* ---------- Layout ---------- */
  function layout() {
    const Wd = root.clientWidth, Ht = root.clientHeight;
    const cs = getComputedStyle(root);
    const sL = parseFloat(cs.getPropertyValue("--sl")) || 0, sR = parseFloat(cs.getPropertyValue("--sr")) || 0;
    const sT = parseFloat(cs.getPropertyValue("--st")) || 0, sB = parseFloat(cs.getPropertyValue("--sb")) || 0;
    const land = Wd > Ht * 1.05;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Knaprækken øverst (🏠 fra menuen, 🔊 og 🧹): mål de rigtige knapper, så bakkerne altid starter under dem
    let raekke = Ht * .02 + sT + clamp(Ht * .085, 56, 78);
    for (const k of [document.getElementById("home"), ...root.querySelectorAll(".vip-knap")]) {
      if (!k || k.hidden) continue;
      const r = k.getBoundingClientRect(); if (r.height) raekke = Math.max(raekke, r.bottom);
    }
    raekke += 6; // knappernes skygge
    const o = { Wd, Ht, dpr, land, slots: [], raekke };
    // Bakke: en afrundet plade med pladser (kolonner × rækker) til klodserne, i den rækkefølge de står i KLODSER
    const bakke = (x, y, w, h, kol, rk, fra) => {
      const pad = 8, sw = (w - 2 * pad) / kol, sh = (h - 2 * pad) / rk;
      for (let i = 0; i < kol * rk; i++) o.slots.push({ kind: "klods", t: KLODSER[fra + i], x: x + pad + (i % kol) * sw, y: y + pad + (i / kol | 0) * sh, w: sw, h: sh });
      return { x, y, w, h };
    };
    if (land) {
      // To bakker med tre klodser hver, en i hver side, lodret centreret under knaprækken
      const tw = clamp(Wd * .1, 100, 136);
      const y0 = raekke + 14, y1 = Ht - sB - 12;
      const th = Math.min(y1 - y0, 3 * 150 + 16), ty = y0 + (y1 - y0 - th) / 2;
      const xv = sL + 10, xh = Wd - sR - 10 - tw;
      o.bakker = [bakke(xv, ty, tw, th, 1, 3, 0), bakke(xh, ty, tw, th, 1, 3, 3)];
      o.playL = xv + tw + 10; o.playR = xh - 10;
      o.floorY = Ht - sB - Math.max(18, Ht * .035);
    } else {
      // Én bakke forneden: to rækker med tre store pladser, vandret centreret
      const rh = clamp(Ht * .085, 68, 84), ww = Math.min(Wd - sL - sR - 16, 560);
      const th = 2 * rh + 16, ty = Ht - sB - 8 - th, x0 = sL + (Wd - sL - sR - ww) / 2;
      o.bakker = [bakke(x0, ty, ww, th, 3, 2, 0)];
      o.playL = sL + 4; o.playR = Wd - sR - 4;
      o.floorY = ty - 14;
    }
    const pw = o.playR - o.playL, ph = o.floorY - (raekke + 4);
    o.ppm0 = Math.max(84, Math.min(pw / 10, ph / 7.4, 120)); // pixels pr. enhed ved zoom 1
    o.ppm = o.ppm0;                                          // ... og lige nu (ppm0 × zoom), sættes af kameraet
    o.cx = (o.playL + o.playR) / 2;
    o.halfW = pw / 2 / o.ppm0;                // halv bredde af legeområdet i verdens-enheder
    o.topY = (o.floorY - raekke) / o.ppm0;    // knaprækkens underkant i verdens-enheder (ved zoom 1)
    o.beamL = Math.min(6.4, o.halfW * 2 - 0.3);
    o.pivotY = (o.beamL / 2) * Math.sin(VIP_MAX) + (BOM_T / 2) * Math.cos(VIP_MAX) + 0.015;
    return o;
  }
  const toScreen = (x, y) => [L.cx + x * L.ppm, L.floorY - y * L.ppm];
  const toWorld = (px, py) => [(px - L.cx) / L.ppm, (L.floorY - py) / L.ppm];

  /* ---------- Byg verdenen ---------- */
  function bygStatik() {
    // fjern gamle statiske ting og bommen (bevar vinklen)
    let a0 = 0, w0 = 0;
    if (beam) { a0 = beam.a; w0 = beam.w; W.remove(beam); }
    W.statik.forEach(b => W.remove(b)); W.statik = [];
    const gulv = W.add(boks(200, 4), 0, -2, 0, { static: true, mu: 0.75, edge: true });
    const hv = W.add(boks(4, 200), -L.halfW - 2, 100, 0, { static: true, mu: 0.3, edge: true });
    const hh = W.add(boks(4, 200), L.halfW + 2, 100, 0, { static: true, mu: 0.3, edge: true });
    const fw = Math.min(1.5, L.pivotY * 1.5);
    const fod = W.add(poly([[-fw / 2, 0], [fw / 2, 0], [0, L.pivotY - BOM_T / 2 - 0.04]]), 0, 0, 0, { static: true, mu: 0.6 });
    // poly() flytter til tyngdepunktet — læg den tilbage, så bunden står på gulvet
    fod.y = -fod.s.v[0][1]; W.xf(fod); fod.kind = "fod";
    W.statik = [gulv, hv, hh, fod];
    const bomMasse = 8;
    beam = W.add(boks(L.beamL, BOM_T), 0, L.pivotY, a0, { m: bomMasse, pin: true, mu: 0.8, ad: VIP_DAMP, kind: "bom" });
    beam.gnid = VIP_GNID; beam.limit = VIP_MAX; beam.w = w0; beam.noSleep = false;
    W.filter = (A, B) => {
      if ((A === beam && B === fod) || (B === beam && A === fod)) return false;
      if (A.ghost || B.ghost) return false; // ny klods fra bakken svæver gennem alt, til den er fri
      if (A.flyv || B.flyv) return false;
      return true;
    };
    // hold kroppe inden for de nye vægge
    for (const b of W.bodies) if (!W.statik.includes(b) && b !== beam) {
      const r = b.s.r; b.x = clamp(b.x, -L.halfW + r * .7, L.halfW - r * .7); if (b.y < r) b.y = r + .05; W.wake(b); W.xf(b);
    }
  }
  function nyKrop(kind, t, x, y, a = 0) {
    const b = W.add(t.form(), x, y, a, { mu: t.id === "rulle" ? 0.7 : 0.62, ad: t.id === "rulle" ? 0.9 : 0.1, kind: "klods", data: t });
    b.born = performance.now();
    return b;
  }
  const brugerKroppe = () => W.bodies.filter(b => b.kind === "klods");

  /* ---------- Opsætninger (dybe links) ---------- */
  function opsaet(dyb) {
    const kube = KLODSER[0], s = 1.15;
    const ovenpaa = (x, h) => L.pivotY + BOM_T / 2 + h; // højde over bommens top ved vandret bom
    if (dyb === "taarn" || dyb === "hoejt") {
      // Er der plads på gulvet ved siden af vippen, står tårnet der; ellers midt på vippen.
      // 'hoejt' er et tårn, der er højere end skærmen ved zoom 1: kameraet zoomer ud.
      const n = dyb === "hoejt" ? 9 : 6, fri = L.halfW - L.beamL / 2;
      if (fri > 1.5) { const x = -(L.beamL / 2 + fri / 2); for (let i = 0; i < n; i++) nyKrop("klods", kube, x, s / 2 + i * s); }
      else for (let i = 0; i < n; i++) nyKrop("klods", kube, 0, ovenpaa(0, s / 2 + i * s));
      if (dyb === "hoejt") brugerKroppe().forEach(b => b.barn = true); // tæller som barnets eget tårn
    } else if (dyb === "vippe") {
      // to kuber yderst til venstre: vippen tipper helt ned
      const x = -(L.beamL / 2 - .7);
      for (let i = 0; i < 2; i++) nyKrop("klods", kube, x, ovenpaa(x, s / 2 + i * s) + 0.2);
    } else if (dyb === "lige") {
      // én kube på hver side, lige langt ude: i balance
      const x = Math.min(L.beamL / 2 - .7, 1.6);
      nyKrop("klods", kube, -x, ovenpaa(-x, s / 2)); nyKrop("klods", kube, x, ovenpaa(x, s / 2));
    } else if (dyb === "skaev") {
      // én kube yderst til venstre, to yderst til højre: tipper mod højre
      const x = L.beamL / 2 - .7;
      nyKrop("klods", kube, -x, ovenpaa(-x, s / 2));
      for (let i = 0; i < 2; i++) nyKrop("klods", kube, x, ovenpaa(x, s / 2 + i * s));
    } else if (dyb === "arm") {
      // vægtstangen: to kuber halvt så langt ude til venstre vejer det samme som én yderst til højre
      const x = L.beamL / 2 - .7;
      for (let i = 0; i < 2; i++) nyKrop("klods", kube, -x / 2, ovenpaa(-x / 2, s / 2 + i * s));
      nyKrop("klods", kube, x, ovenpaa(x, s / 2));

    } else if (dyb === "vaelt") {
      // Et tårn yderst på vippen: vippen begynder at tippe, og tårnet vælter, medmindre barnet hjælper
      const x = Math.min(L.beamL / 2 - .7, 1.25);
      for (let i = 0; i < 5; i++) nyKrop("klods", kube, x, ovenpaa(x, s / 2 + i * s));
    }
  }

  /* ---------- Kamera ---------- */
  // Gulvet bliver liggende i bunden af scenen. Vokser tårnet (eller stjernen) op mod knaprækken, zoomer
  // kameraet blødt ud, så hele tårnet altid kan ses — dog højst til ZOOM_MIN. Det zoomer langsomt ind igen.
  function kamera(dt) {
    let top = goal.taarnFaerdig ? 0 : goal.maerke + 0.75;
    for (const b of W.bodies) {
      if (b.kind !== "klods" || b.ghost || (pointer && pointer.b === b)) continue;
      top = Math.max(top, b.aabb[3] + 1.5); // plads til én klods mere ovenpå
    }
    const maal = clamp(L.topY / Math.max(top, 0.1), ZOOM_MIN, 1);
    // ud: hurtigt (ca. 0,4 s), ind: roligt (ca. 1,5 s) og ikke mens barnet holder en klods
    const k = maal < zoom ? 2.5 : (pointer && pointer.b ? 0 : 0.7);
    zoom += (maal - zoom) * Math.min(1, dt * k);
    if (Math.abs(maal - zoom) < 1e-4) zoom = maal;
    L.ppm = L.ppm0 * zoom;
  }
  // Den højeste verdens-højde, der kan ses lige nu (knaprækkens underkant). En klods kan ikke løftes højere,
  // så tårnet aldrig vokser ud over det, kameraet kan vise.
  const synligTop = () => L.topY * L.ppm0 / L.ppm;
  const maerkeStart = () =>
 Math.min(4.7, L.topY - 0.8);
  const maerkeMax = () => L.topY / ZOOM_MIN - 1.25;  // højeste stjerne: kan ses ved største udzoomning, og en kube kan nå den

  /* ---------- Mål og fejring ---------- */
  function nyeMaal() {
    return { maerke: maerkeStart(), taarnFaerdig: false, lavT: 0, taarnT: 0, ligeT: 0, ligeKlar: true, ligeSig: "", sidstFejr: 0,
      naeste: 0, hvile: performance.now(), roedT: 0, reddet: 0, vaeltSidst: -1e9, fald: [], smil: 0, hjaelpSidst: -1e9 };
  }
  const MAAL = [["vip-maal-lige", "Kan du få vippen helt lige?"], ["vip-maal-taarn", "Kan du bygge et højt tårn helt op til stjernen?"]];
  function sigMaal(i) {
    const m = MAAL[(i ?? goal.naeste) % MAAL.length]; if (i === undefined) goal.naeste++;
    Spil.say(m[1], null, m[0]); goal.hvile = performance.now();
  }
  function ros() { const i = Math.random() * 5 | 0; return ["ros-" + i, ["Super!", "Flot klaret!", "Sejt!", "Du er god til det!", "Wow!"][i]]; }

  // Hvilke kroppe ligger på vippen (direkte eller via andre klodser)?
  function paaVippen() {
    const res = new Set([beam]), q = [beam];
    while (q.length) { const b = q.pop(); for (const n of W.naboer(b)) if (!res.has(n) && n.invM > 0 && n.kind && !(pointer && pointer.b === n)) { res.add(n); q.push(n); } }
    res.delete(beam); return [...res];
  }

  // Momentet om bolten fra alt, der ligger på vippen: masse × vandret arm (tyngden G er fælles og forkortes ud).
  // net > 0: venstre side er tungest. forhold = |net| / summen af |momenter| (0 = perfekt balance, 1 = kun én side).
  function moment(paa = paaVippen()) {
    let net = 0, sum = 0;
    for (const b of paa) { const t = -b.m * (b.x - beam.x); net += t; sum += Math.abs(t); }
    return { net, sum, forhold: sum > 1e-9 ? Math.abs(net) / sum : 1 };
  }

  function opdaterMaal(dt) {
    const nu = performance.now();
    const paa = paaVippen();
    const v = paa.filter(b => b.x < -0.2), h = paa.filter(b => b.x > 0.2);
    const vinkel = Math.abs(beam.a), stille = Math.abs(beam.w) < 0.03;
    // I balance: noget på hver side, momenterne går (næsten) lige op, og bommen er vandret og i ro.
    // Ingen snyd: 1 klods mod 2 lige langt ude giver forholdet 1/3 og tæller aldrig.
    const mo = moment(paa);
    goal.forhold = mo.forhold;
    const lige = v.length && h.length && mo.forhold < LIGE_GRAENSE && vinkel < 2 * Math.PI / 180 && stille;
    if (lige) goal.ligeT += dt; else goal.ligeT = 0;
    const sig = paa.map(b => b.id).sort().join(",");
    if (vinkel > 4 * Math.PI / 180 || (sig !== goal.ligeSig && !lige)) goal.ligeKlar = true;
    goal.smil += ((lige ? 1 : vinkel < 5 * Math.PI / 180 ? .4 : 0) - goal.smil) * Math.min(1, dt * 4);
    if (goal.ligeT >= LIGE_TID && goal.ligeKlar) {
      goal.ligeKlar = false; goal.ligeSig = sig; goal.ligeT = 0;
      fejrLige();
    }

    // Højt tårn: en klods i ro, der rækker op til stjernen
    let hoej = null;
    let hoejest = 0;
    for (const b of brugerKroppe()) {
      if (pointer && pointer.b === b) continue;
      hoejest = Math.max(hoejest, b.aabb[3]);
      if (!goal.taarnFaerdig && b.barn && b.aabb[3] >= goal.maerke && (b.sleep || Math.hypot(b.vx, b.vy) < .25) && b.aabb[1] > 0.3) hoej = hoej || b;
    }
    if (hoej) goal.taarnT += dt; else goal.taarnT = 0;
    if (goal.taarnT > 1.0) { goal.taarnT = 0; fejrTaarn(hoej); }
    // Er tårnet væltet eller fjernet, starter stjernen forfra nede ved det første mål
    if (goal.maerke > maerkeStart() + 0.01 || goal.taarnFaerdig) {
      if (hoejest < maerkeStart() - 1.2) goal.lavT += dt; else goal.lavT = 0;
      if (goal.lavT > 2.5) { goal.maerke = maerkeStart(); goal.taarnFaerdig = false; goal.lavT = 0; }
    }

    // Hjælp: vippen tipper med et tårn på
    // a > 0 drejer mod uret: venstre ende går ned
    const nedeSide = beam.a > 0 ? v : h;
    const hoejtPaa = paa.some(b => b.aabb[3] - L.pivotY > 2.4);
    if (vinkel > 9 * Math.PI / 180 && Math.abs(beam.w) > 0.02 && nedeSide.some(b => b.aabb[3] - L.pivotY > 2.4) && nu - goal.hjaelpSidst > 20000 && !Spil.isTalking()) {
      goal.hjaelpSidst = nu; goal.redder = nu;
      Spil.say("Hov! Vippen tipper. Læg noget på den anden side!", null, "vip-redd");
    }
    if (goal.redder && nu - goal.redder > 1500 && nu - goal.redder < 15000 && vinkel < VIP_MAX - 3 * Math.PI / 180 && Math.abs(beam.w) < 0.01 && hoejtPaa && v.length && h.length) {
      goal.redder = 0; goal.ligeKlar = false; goal.ligeSig = sig;
      later(() => { klokke(); const [sx, sy] = toScreen(0, L.pivotY); Spil.burst(sx, sy); Spil.say("Puh! Du reddede tårnet!", null, "vip-reddet"); }, 100);
    }
    if (goal.redder && nu - goal.redder > 15000) goal.redder = 0;

    // Stille et stykke tid → foreslå et mål (sjældnere og sjældnere)
    const pause = 35000 + goal.naeste * 15000;
    if (nu - goal.hvile > pause && !pointer && !Spil.isTalking() && goal.naeste < 8) sigMaal();
  }

  function fejrLige() {
    goal.hvile = performance.now(); goal.ligeAntal = (goal.ligeAntal || 0) + 1;
    klokke();
    const [sx, sy] = toScreen(0, L.pivotY);
    Spil.burst(sx, sy - 20);
    later(() => Spil.burst(sx - L.beamL * L.ppm * .3, sy - 30, "⭐✨⭐✨"), 180);
    later(() => Spil.burst(sx + L.beamL * L.ppm * .3, sy - 30, "⭐✨⭐✨"), 300);
    const r = ros();
    later(() => Spil.say("Ahh! Nu er vippen helt lige! " + r[1], null, ["vip-lige", r[0]]), 500);
  }
  function fejrTaarn(b) {
    goal.hvile = performance.now();
    Spil.sfx.fanfare();
    const [sx, sy] = toScreen(L.halfW - 0.5, goal.maerke);
    Spil.burst(sx, sy);
    const [bx, by] = toScreen(b.x, b.aabb[3]); Spil.burst(bx, by, "⭐✨🌟✨");
    goal.glimt = 1;
    const r = ros();
    Spil.say("Wow! Sikke et højt tårn! " + r[1], null, ["vip-hoejt", r[0]]);
    // næste gang lidt højere — kameraet zoomer ud, så den nye stjerne kan ses. Er vi helt oppe, er målet nået.
    if (goal.maerke >= maerkeMax() - 0.01) goal.taarnFaerdig = true;
    else goal.maerke = Math.min(Math.max(goal.maerke, b.aabb[3]) + 1.15, maerkeMax());
  }

  /* ---------- Væltning ---------- */
  function registrerStoed(imp) {
    const nu = performance.now();
    for (const it of imp) for (const b of [it.A, it.B]) {
      if (!b.kind || b.kind === "bom") continue;
      if (b.restY !== undefined && b.restY > 0.9 && b.aabb[1] < b.restY - 0.7 && it.v > 2.2) {
        if (!goal.fald.some(f => f.b === b)) goal.fald.push({ b, t: nu });
        b.restY = undefined;
      }
    }
    goal.fald = goal.fald.filter(f => nu - f.t < 1200);
    if (goal.fald.length >= 3 && nu - goal.vaeltSidst > 9000) {
      goal.vaeltSidst = nu; goal.fald = [];
      bum();
      const lines = [["vip-vaelt-0", "Bum! Hov, det væltede. Vi bygger igen!"], ["vip-vaelt-1", "Bum! Sikke et brag! Vi bygger bare igen."], ["vip-vaelt-2", "Hov! Alle klodserne faldt ned. Det var sjovt!"]];
      const l = lines[(goal.vaeltN++) % 3];
      later(() => Spil.say(l[1], null, l[0]), 350);
      goal.redder = 0;
    }
  }

  /* ---------- Pointer ---------- */
  function hit(px, py) {
    const [x, y] = toWorld(px, py), tol = 16 / L.ppm;
    let best = null, bd = 1e9;
    for (let i = W.bodies.length - 1; i >= 0; i--) {
      const b = W.bodies[i];
      if (!(b.kind === "klods" || b.kind === "bom") || b.flyv) continue;
      const d = afstand(b, x, y);
      const t = b.kind === "bom" ? 0 : tol;
      if (d <= t && d < bd - 1e-6) { best = b; bd = d; if (d <= 0) break; }
    }
    return best;
  }
  function afstand(b, x, y) { // fortegn: negativ inde i kroppen
    if (b.s.type === "c") return Math.hypot(x - b.x, y - b.y) - b.s.r;
    let mx = -1e9;
    for (let i = 0; i < b.wv.length; i++) mx = Math.max(mx, b.wn[i][0] * (x - b.wv[i][0]) + b.wn[i][1] * (y - b.wv[i][1]));
    return mx;
  }
  function slotVed(px, py) { return L.slots.find(s => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h); }
  const iBakke = (px, py) => L.bakker.some(r => px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4);

  function startTraek(b, px, py, fraBakke) {
    const [x, y] = toWorld(px, py);
    const erBom = b === beam;
    let lx = 0, ly = 0;
    if (erBom) { const c = Math.cos(-b.a), s = Math.sin(-b.a), dx = x - b.x, dy = y - b.y; lx = c * dx - s * dy; ly = s * dx + c * dy; }
    pointer.b = b; pointer.off = erBom ? [0, 0] : [b.x - x, b.y - y];
    b.barn = true; // tæller med til "højt tårn"
    W.wake(b);
    W.dragJ = { b, lx, ly, tx: b.x, ty: b.y, ix: 0, iy: 0, f: erBom ? 2.2 : 8, z: erBom ? 1 : 0.85,
      m: erBom ? 12 : b.m, maxF: erBom ? 160 : b.m * G * 30 };
    if (!erBom) { b.noGrav = true; b.holdA = b.a; b.ghost = fraBakke; }
    for (const n of W.naboer(b)) W.wake(n);
  }
  // Klodsen slippes: den når lige at følge med hen til, hvor fingeren slap (højst 0,25 s), så slipper fjederen
  function endSlip() {
    const e = efterslip; efterslip = null; if (!e || !W) return;
    if (W.dragJ && W.dragJ.b === e.b) W.dragJ = null;
    const b = e.b; b.noGrav = false; delete b.holdA;
    // blid nedlægning: små børn vil sætte klodsen, ikke kaste den
    b.vx *= .4; b.vy *= .4; b.w *= .4;
    const sp = Math.hypot(b.vx, b.vy); if (sp > 3.5) { b.vx *= 3.5 / sp; b.vy *= 3.5 / sp; }
  }
  function slipTraek(px, py) {
    const b = pointer.b; if (!b) return;
    if (b === beam) W.dragJ = null;
    if (b !== beam) {
      // sluppet over bakken (eller uden for legeområdet) → tilbage i bakken
      if (iBakke(px, py)) { W.dragJ = null; flyvHjem(b, 0); tok(false); }
      else if (b.ghost) {
        // en ny klods, der stadig svæver: den lander lige under fingeren (også ved et hurtigt træk)
        const [fx, fy] = toWorld(px, py); b.x = fx + pointer.off[0]; b.y = fy + pointer.off[1];
        const hw = (b.aabb[2] - b.aabb[0]) / 2, hh = (b.aabb[3] - b.aabb[1]) / 2;
        b.x = clamp(b.x, -L.halfW + hw + .02, L.halfW - hw - .02); b.y = clamp(b.y, hh + .05, Math.max(hh + .05, synligTop() - hh));
        W.xf(b);
        // ligger den inde i noget, så løft den op ovenpå og lad den falde
        for (let i = 0; i < 60 && W.overlap(b, 0); i++) { b.y += 0.1; W.xf(b); }
        b.vx = b.vy = 0; b.ghost = false; W.dragJ = null; b.noGrav = false; delete b.holdA;
        // tårnet er så højt, at klodsen ikke kan ses ovenpå: den flyver tilbage i bakken
        if (b.aabb[3] > synligTop() + 0.05) { flyvHjem(b, 0); tok(false); }

      } else if (W.dragJ && W.dragJ.b === b) { efterslip = { b, t: 0 }; }
    }
    pointer.b = null;
  }

  function onDown(e) {
    if (pointer && pointer.id !== undefined && pointer.id !== e.pointerId) return; // kun én finger ad gangen
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    endSlip();
    pointer = { id: e.pointerId, x0: px, y0: py, px, py, t0: performance.now(), b: null, maxMove: 0, fra: null };
    goal.hvile = performance.now();
    const s = slotVed(px, py);
    if (s) {
      if (brugerKroppe().length >= MAX_KROPPE) fjernAeldste();
      const [x, y] = toWorld(px, py);
      const b = nyKrop(s.kind, s.t, x, y);
      b.ghost = true;
      pointer.fra = "bakke";
      startTraek(b, px, py, true);
      pointer.off = [0, 0];
      tok(true);
      return;
    }
    const b = hit(px, py);
    if (b) { startTraek(b, px, py, false); if (b !== beam) tok(true); pointer.fra = "scene"; }
  }
  function onMove(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const r = cv.getBoundingClientRect();
    pointer.px = e.clientX - r.left; pointer.py = e.clientY - r.top;
    pointer.maxMove = Math.max(pointer.maxMove, Math.hypot(pointer.px - pointer.x0, pointer.py - pointer.y0));
  }
  function onUp(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const p = pointer, b = p.b, kort = performance.now() - p.t0 < 280 && p.maxMove < 14;
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (b && kort && p.fra === "scene") {
      W.dragJ = null; b.noGrav = false; delete b.holdA; p.b = null;
      if (b !== beam) hop(b);
      else klonk(.3, .7);
    } else if (b) slipTraek(px, py);
    pointer = null;
  }

  // Et kort tryk: klodsen hopper og drejer 90°.
  function hop(b) {
    W.wake(b); for (const n of W.naboer(b)) W.wake(n);
    const q = Math.PI / 2;
    const maal = Math.round(b.a / q) * q + q;
    b.hop = { t: 0, T: 0.32, a0: b.a, a1: maal, x0: b.x, y0: b.y };
    b.noGrav = true;
    W.dragJ = { b, lx: 0, ly: 0, tx: b.x, ty: b.y, ix: 0, iy: 0, f: 7, z: 0.9, m: b.m, maxF: b.m * G * 25, hop: true };
    tok(true);
  }

  /* ---------- Rydning ---------- */
  function slotFor(b) { return L.slots.find(s => s.t === b.data); }
  function flyvHjem(b, forsink) {
    const s = slotFor(b); if (!s) { W.remove(b); return; }
    W.remove(b);
    const [sx, sy] = toScreen(b.x, b.y);
    flyers.push({ b, t: -forsink, T: RM.matches ? 0.2 : 0.55, sx, sy, sa: b.a, ex: s.x + s.w / 2, ey: s.y + s.h / 2 });
  }
  function ryd() {
    const alle = brugerKroppe();
    const knap = root.querySelector(".vip-ryd"); knap.classList.remove("vip-fej"); void knap.offsetWidth; knap.classList.add("vip-fej");
    endSlip(); if (pointer && pointer.b) { W.dragJ = null; pointer.b = null; }
    if (!alle.length) { Spil.say("Her er allerede ryddet op!", null, "vip-ryddet"); return; }
    sus(0.9);
    alle.sort((p, q) => p.x - q.x).forEach((b, i) => flyvHjem(b, RM.matches ? 0 : i * 0.035));
    sweep = RM.matches ? null : { t: 0, T: 0.9 };
    W.wake(beam);
    goal.redder = 0; goal.maerke = maerkeStart(); goal.taarnFaerdig = false;
    later(() => Spil.say("Så er der ryddet op!", null, "vip-ryd"), RM.matches ? 300 : 900);
  }
  function fjernAeldste() {
    const k = brugerKroppe().filter(b => !(pointer && pointer.b === b)).sort((p, q) => p.born - q.born)[0];
    if (k) flyvHjem(k, 0);
  }

  /* ---------- Tegning ---------- */
  function tegnBaggrund(c) {
    const { Wd, Ht, floorY } = L;
    // væg
    const g = c.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, "#fff7e6"); g.addColorStop(1, "#fde7c4");
    c.fillStyle = g; c.fillRect(0, 0, Wd, floorY);
    c.fillStyle = "rgba(255,214,165,.32)";
    for (let x = 0; x < Wd; x += 64) c.fillRect(x, 0, 26, floorY);
    // vindue med himmel (pynt)
    const vw = Math.min(L.ppm0 * 2.2, Wd * .22), vx = L.cx + L.halfW * L.ppm0 * .55 - vw / 2, vy = Math.max(Ht * .1, L.raekke + 30);
    if (L.land) {
      c.fillStyle = "#cfeefe"; rr(c, vx, vy, vw, vw * .8, 14); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(vx + vw * .35, vy + vw * .35, vw * .12, 0, 7); c.arc(vx + vw * .5, vy + vw * .3, vw * .15, 0, 7); c.arc(vx + vw * .65, vy + vw * .36, vw * .11, 0, 7); c.fill();
      c.strokeStyle = "#d8b98b"; c.lineWidth = 8; rr(c, vx, vy, vw, vw * .8, 14); c.stroke();
      c.beginPath(); c.moveTo(vx + vw / 2, vy); c.lineTo(vx + vw / 2, vy + vw * .8); c.moveTo(vx, vy + vw * .4); c.lineTo(vx + vw, vy + vw * .4); c.lineWidth = 5; c.stroke();
    }
    // fodliste og trægulv
    c.fillStyle = "#fffaf0"; c.fillRect(0, floorY - 12, Wd, 12);
    c.fillStyle = "#e2c9a0"; c.fillRect(0, floorY - 3, Wd, 3);
    const fg = c.createLinearGradient(0, floorY, 0, Ht);
    fg.addColorStop(0, "#e9cf9f"); fg.addColorStop(1, "#d9b77f");
    c.fillStyle = fg; c.fillRect(0, floorY, Wd, Ht - floorY);
    c.fillStyle = "rgba(150,105,55,.18)";
    for (let x = 0; x < Wd; x += 90) c.fillRect(x, floorY, 2, Ht - floorY);
    // tæppe under scenen
    const tl = L.cx - L.halfW * L.ppm - 4, tr = L.cx + L.halfW * L.ppm + 4, th = Math.min(16, (Ht - floorY) * .6 + 6);
    const farver = ["#ff9aa2", "#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff"];
    c.save(); rr(c, tl, floorY - 2, tr - tl, th, 8); c.clip();
    for (let i = 0, x = tl; x < tr; i++, x += 34) { c.fillStyle = farver[i % 5]; c.fillRect(x, floorY - 2, 34, th); }
    c.restore();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

  function tegnMaerke(c) {
    if (goal.taarnFaerdig) return;
    const [, y] = toScreen(0, goal.maerke), x0 = L.cx - L.halfW * L.ppm + 8, x1 = L.cx + L.halfW * L.ppm - 8;
    c.save();
    c.setLineDash([14, 12]); c.lineWidth = 4; c.strokeStyle = "rgba(255,170,30,.55)";
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1 - 40, y); c.stroke();
    c.setLineDash([]);
    const gl = goal.glimt || 0, s = 40 + gl * 16;
    c.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("⭐", x1 - 18, y);
    c.restore();
  }

  function tegnFod(c) {
    const f = W.statik[3], [px, py] = toScreen(0, 0), ppm = L.ppm;
    const top = toScreen(0, L.pivotY);
    const fw = Math.min(1.5, L.pivotY * 1.5) * ppm;
    c.save();
    c.beginPath(); c.moveTo(px - fw / 2, py); c.lineTo(px + fw / 2, py); c.lineTo(px, top[1] + BOM_T / 2 * ppm + 2); c.closePath();
    c.fillStyle = "#4d96ff"; c.fill(); c.lineWidth = 4; c.lineJoin = "round"; c.strokeStyle = "#2a63b8"; c.stroke();
    // ansigt: smiler mere, jo mere lige vippen er
    const fy = py - (L.pivotY - BOM_T / 2) * ppm * .38, s = Math.min(fw * .22, (L.pivotY * ppm) * .2);
    c.fillStyle = "#1f3a5f";
    const blink = (performance.now() / 3200 % 1) > .97 ? .2 : 1;
    c.beginPath(); c.ellipse(px - s * .9, fy - s * .5, s * .22, s * .3 * blink, 0, 0, 7); c.ellipse(px + s * .9, fy - s * .5, s * .22, s * .3 * blink, 0, 0, 7); c.fill();
    const sm = goal.smil;
    c.strokeStyle = "#1f3a5f"; c.lineWidth = Math.max(3, s * .18); c.lineCap = "round";
    c.beginPath();
    if (sm > .35) c.arc(px, fy - s * .1, s * (.5 + sm * .35), .15 * Math.PI, .85 * Math.PI);
    else c.ellipse(px, fy + s * .45, s * .3, s * .25, 0, 0, 7);
    c.stroke();
    if (sm > .6) { c.fillStyle = "rgba(255,120,140,.45)"; c.beginPath(); c.arc(px - s * 1.5, fy + s * .2, s * .3, 0, 7); c.arc(px + s * 1.5, fy + s * .2, s * .3, 0, 7); c.fill(); }
    c.restore();
  }

  function tegnBom(c) {
    const [x, y] = toScreen(beam.x, beam.y), ppm = L.ppm, l = L.beamL * ppm, t = BOM_T * ppm;
    // vandret hjælpelinje, så man kan se, hvor "lige" er
    if (Math.abs(beam.a) > 0.01) {
      c.save(); c.setLineDash([8, 10]); c.strokeStyle = "rgba(31,58,95,.18)"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - l / 2, y); c.lineTo(x + l / 2, y); c.stroke(); c.restore();
    }
    c.save(); c.translate(x, y); c.rotate(-beam.a);
    const g = c.createLinearGradient(0, -t / 2, 0, t / 2); g.addColorStop(0, "#f3c27a"); g.addColorStop(1, "#c98a3d");
    rr(c, -l / 2, -t / 2, l, t, t * .35); c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = "#8f5a22"; c.stroke();
    c.strokeStyle = "rgba(110,60,20,.25)"; c.lineWidth = 2;
    for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(-l / 2 + 12, -t / 2 + i * t / 3); c.bezierCurveTo(-l / 6, -t / 2 + i * t / 3 + 3, l / 6, -t / 2 + i * t / 3 - 3, l / 2 - 12, -t / 2 + i * t / 3); c.stroke(); }
    // gummiknopper i enderne
    c.fillStyle = "#ff6b6b";
    [-1, 1].forEach(sd => { rr(c, sd * l / 2 - (sd > 0 ? t * .5 : 0), -t / 2, t * .5, t, t * .2); c.fill(); });
    c.restore();
    // bolt + balance-ring
    c.save(); c.translate(x, y);
    const rb = t * .42;
    if (goal.ligeT > 0.05 && goal.ligeKlar) {
      c.strokeStyle = "#ffc93c"; c.lineWidth = 6; c.lineCap = "round";
      c.beginPath(); c.arc(0, 0, rb + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, goal.ligeT / LIGE_TID)); c.stroke();

    }
    c.fillStyle = "#8a9bb0"; c.beginPath(); c.arc(0, 0, rb, 0, 7); c.fill();
    c.fillStyle = "#c9d6e3"; c.beginPath(); c.arc(-rb * .25, -rb * .25, rb * .45, 0, 7); c.fill();
    c.restore();
  }

  function tegnKrop(c, b, x, y, a, sc) {
    const sp = sprite(b);
    sc *= L.ppm / L.ppm0; // kameraets zoom
    c.save(); c.translate(x, y); c.rotate(-a); if (sc !== 1) c.scale(sc, sc);

    c.drawImage(sp.cv, -sp.ext, -sp.ext, sp.ext * 2, sp.ext * 2);
    c.restore();
  }
  function sprite(b) {
    const k = b.data.id;
    // tegnes én gang ved zoom 1 og skaleres ned, når kameraet zoomer ud
    if (!sprites[k]) sprites[k] = tegnKlods(b.data, b.s, L.ppm0, L.dpr);
    return sprites[k];
  }

  function tegnBakker(c) {
    for (const r of L.bakker) {

      c.save();
      rr(c, r.x, r.y, r.w, r.h, 22); c.fillStyle = "rgba(255,253,247,.9)"; c.fill();
      c.lineWidth = 4; c.strokeStyle = "#e2c9a0"; c.stroke();
      c.restore();
    }
    for (const s of L.slots) {
      const sh = s.sh || (s.sh = s.t.form());
      const fake = { kind: s.kind, data: s.t, s: sh };
      const sp = sprite(fake);
      // skalér så formen passer i pladsen
      const bw = sh.type === "c" ? sh.r * 2 : Math.max(...sh.v.map(p => p[0])) - Math.min(...sh.v.map(p => p[0]));
      const bh = sh.type === "c" ? sh.r * 2 : Math.max(...sh.v.map(p => p[1])) - Math.min(...sh.v.map(p => p[1]));
      const sc = Math.min((s.w - 14) / (bw * L.ppm0), (s.h - 12) / (bh * L.ppm0), 1);
      // midtpunktet af formens AABB (tyngdepunktet ligger ikke altid i midten, fx taget)
      let mx = 0, my = 0;
      if (sh.type === "p") { mx = (Math.max(...sh.v.map(p => p[0])) + Math.min(...sh.v.map(p => p[0]))) / 2; my = (Math.max(...sh.v.map(p => p[1])) + Math.min(...sh.v.map(p => p[1]))) / 2; }
      const cx = s.x + s.w / 2 - mx * L.ppm0 * sc, cy = s.y + s.h / 2 + my * L.ppm0 * sc;
      c.save(); c.translate(cx, cy); c.scale(sc, sc); c.drawImage(sp.cv, -sp.ext, -sp.ext, sp.ext * 2, sp.ext * 2); c.restore();
    }
  }

  function tegn() {
    const c = ctx, dpr = L.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    tegnBaggrund(c);
    tegnMaerke(c);
    tegnBakker(c);
    tegnFod(c);
    // skygge under det, man trækker
    const tb = pointer && pointer.b && pointer.b !== beam ? pointer.b : null;
    tegnBom(c);
    for (const b of W.bodies) {
      if (!b.kind || b.kind === "fod" || b === tb || b === beam) continue;
      const [x, y] = toScreen(b.x, b.y);
      tegnKrop(c, b, x, y, b.a, 1);
    }
    if (tb) {
      const [x, y] = toScreen(tb.x, tb.y);
      c.save(); c.globalAlpha = .18; c.fillStyle = "#1f3a5f";
      c.beginPath(); c.ellipse(x + 6, y + 10, tb.s.r * L.ppm * .8, tb.s.r * L.ppm * .5, 0, 0, 7); c.fill(); c.restore();
      if (tb.ghost && W.overlap(tb, 0)) c.globalAlpha = .7; // svæver gennem noget: lidt gennemsigtig
      tegnKrop(c, tb, x, y - 2, tb.a, 1.06);
      c.globalAlpha = 1;
    }
    for (const f of flyers) {
      if (f.t < 0) { tegnKrop(c, f.b, f.sx, f.sy, f.sa, 1); continue; }
      const u = Math.min(1, f.t / f.T), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const x = f.sx + (f.ex - f.sx) * e, y = f.sy + (f.ey - f.sy) * e - Math.sin(u * Math.PI) * 60;
      c.globalAlpha = u > .85 ? (1 - u) / .15 : 1;
      tegnKrop(c, f.b, x, y, f.sa * (1 - e), 1 - .55 * e);
      c.globalAlpha = 1;
    }
    if (sweep) {
      const u = sweep.t / sweep.T, x = L.cx - L.halfW * L.ppm + u * L.halfW * 2 * L.ppm;
      // støvskyer bag kosten
      c.save();
      for (let i = 1; i <= 5; i++) {
        const px = x - i * 34, k = 1 - i / 6;
        c.globalAlpha = .55 * k * (1 - u * .5); c.fillStyle = "#fffaf0";
        c.beginPath(); c.arc(px, L.floorY - 12 - (i % 2) * 10, 14 + i * 4, 0, 7); c.fill();
      }
      c.restore();
      c.save(); c.translate(x, L.floorY - 58); c.rotate(.35 + Math.sin(u * 22) * .3);
      // kosten tegnes med streger (emoji-kosten er for bleg på nogle platforme)
      const k = clamp(L.ppm / 90, .8, 1.3);
      c.scale(k, k); c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = "#8f5a22"; c.lineWidth = 9; c.beginPath(); c.moveTo(18, -70); c.lineTo(0, 20); c.stroke();
      c.fillStyle = "#c0392b"; rr(c, -14, 8, 28, 12, 4); c.fill();
      c.beginPath(); c.moveTo(-16, 18); c.lineTo(16, 18); c.lineTo(34, 62); c.lineTo(-34, 62); c.closePath();
      c.fillStyle = "#ffc93c"; c.fill(); c.strokeStyle = "#c9961a"; c.lineWidth = 4; c.stroke();
      c.lineWidth = 2.5; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 4, 22); c.lineTo(i * 9, 60); c.stroke(); }
      c.restore();
    }
  }

  /* ---------- Løkken ---------- */
  function loop(now) {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const t0 = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0); lastT = now;
    kamera(dt);
    if (efterslip) {
      efterslip.t += dt; const J = W.dragJ, b = efterslip.b;
      if (!J || J.b !== b || efterslip.t > 0.25 || Math.hypot(b.x - J.tx, b.y - J.ty) < 0.12) endSlip();
    }
    if (pointer && pointer.b) {
      const J = W.dragJ;
      if (J && !J.hop) {
        const [x, y] = toWorld(pointer.px, pointer.py);
        if (pointer.b === beam) { J.tx = x; J.ty = y; }
        else {
          J.tx = x + pointer.off[0]; J.ty = Math.min(y + pointer.off[1], synligTop() - (pointer.b.aabb[3] - pointer.b.aabb[1]) / 2);
          // En ny klods fra bakken svæver, til fingeren slipper (så den ikke vælter tårne på vejen)
        }
      }
    }
    acc += dt;
    let n = 0;
    const alleStoed = [];
    while (acc >= H && n < 5) {
      hopSkridt(H);
      W.step(H); acc -= H; n++;
      if (W.impacts.length) alleStoed.push(...W.impacts);
    }
    if (acc > H) acc = 0;
    // lyd ved stød
    if (alleStoed.length) {
      alleStoed.sort((p, q) => q.v - p.v);
      const brugt = new Set();
      let k = 0;
      for (const it of alleStoed) {
        if (k >= 3) break;
        const key = it.A.id + ":" + it.B.id; if (brugt.has(key)) continue; brugt.add(key);
        if (it.stop) { klonk(Math.min(1, it.v / 4), .55, false); k++; continue; } // vippen rammer sit stop
        const kr = [it.A, it.B].find(b => b.kind === "klods");
        if (!kr) continue;
        const tone = kr.data.tone * (([it.A, it.B].some(b => b === beam)) ? .85 : 1);
        klonk((it.v - 0.9) / 7, tone); k++;
      }
      registrerStoed(alleStoed);
    }
    // husk hvor højt kroppene lå i ro (til at se, om et tårn vælter)
    for (const b of W.bodies) if (b.kind && b.kind !== "bom" && (b.sleep || b.still > 0.3)) b.restY = b.aabb[1];
    knirk(Math.abs(beam.w));
    for (const f of flyers) f.t += dt;
    flyers = flyers.filter(f => f.t < f.T);
    if (sweep) { sweep.t += dt; if (sweep.t > sweep.T) sweep = null; }
    if (goal.glimt) goal.glimt = Math.max(0, goal.glimt - dt * 1.5);
    opdaterMaal(dt);
    tegn();
    const ms = performance.now() - t0;
    frameMs = frameMs * 0.95 + ms * 0.05;
    stats.frames++; stats.maxMs = Math.max(stats.maxMs, ms); stats.sumMs += ms;
  }
  // Hop-animationen styres via trækkeleddet
  function hopSkridt(h) {
    const J = W.dragJ; if (!J || !J.hop) return;
    const b = J.b, hp = b.hop; if (!hp) { W.dragJ = null; return; }
    hp.t += h;
    const u = Math.min(1, hp.t / hp.T);
    J.tx = hp.x0; J.ty = hp.y0 + Math.sin(u * Math.PI) * 0.55 + u * 0.05;
    b.holdA = hp.a0 + (hp.a1 - hp.a0) * (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    if (u >= 1) { W.dragJ = null; b.noGrav = false; delete b.holdA; delete b.hop; }
  }

  function resize() {
    if (!alive) return;
    L = layout(); L.ppm = L.ppm0 * zoom;
    cv.width = Math.round(L.Wd * L.dpr); cv.height = Math.round(L.Ht * L.dpr);
    sprites = {};
    bygStatik();
    if (goal) goal.maerke = clamp(goal.maerke, 2, maerkeMax());

  }

  /* ---------- Registrering ---------- */
  Spil.register({
    id: "vippetaarn", navn: "Vippetårnet", ikon: "⚖️", farve: "#ffd6bf",
    start(r) {
      Spil.preload(["vip-hej", "vip-maal-lige", "vip-maal-taarn", "vip-lige", "vip-hoejt", "vip-vaelt-0", "vip-redd", "vip-reddet", "vip-ryd",
        "ros-0", "ros-1", "ros-2", "ros-3", "ros-4"]);
      alive = true; timers = []; flyers = []; efterslip = null; sweep = null; pointer = null; frameMs = 0; acc = 0; lastT = performance.now(); zoom = 1;
      stats = { frames: 0, maxMs: 0, sumMs: 0 };
      r.innerHTML = `<div class="vip" style="--sl:env(safe-area-inset-left,0px);--sr:env(safe-area-inset-right,0px);--st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px)">
        <canvas></canvas>
        <button class="vip-knap vip-sig" aria-label="Hør en opgave">🔊</button>
        <button class="vip-knap vip-ryd" aria-label="Ryd op">🧹</button></div>`;
      root = r.querySelector(".vip"); cv = root.querySelector("canvas"); ctx = cv.getContext("2d");
      W = lavVerden(); beam = null;
      lyd = lavLyd();
      resize();
      goal = nyeMaal(); goal.vaeltN = 0;
      const dyb = Spil.dyb || "";
      opsaet(dyb);
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointercancel", onUp);
      root.querySelector(".vip-ryd").onclick = () => { Spil.sfx.click(); ryd(); };
      root.querySelector(".vip-sig").onclick = () => sigMaal();
      window.addEventListener("resize", resize);
      raf = requestAnimationFrame(loop);
      if (dyb === "vaelt" || dyb === "vippe") later(() => Spil.say("Hov! Vippen tipper. Læg noget på den anden side!", null, "vip-redd"), 900);
      else if (dyb === "taarn") later(() => sigMaal(1), 500);
      else if (dyb === "lige") { /* vippen er allerede lige: fejringen kommer af sig selv */ }
      else later(() => Spil.say("Hej! Træk klodserne op på vippen.", () => later(() => sigMaal(0), 6000), "vip-hej"), 400);
      if (dyb === "vaelt" || dyb === "vippe") { goal.hjaelpSidst = performance.now(); goal.redder = performance.now(); }
      // til test (Playwright): læs tilstanden og kør fysikken uden skærm
      window.__vippetaarn = { W: () => W, beam: () => beam, L: () => L, goal: () => goal, stats: () => stats, zoom: () => zoom, lavVerden,
 former: { boks, cirkel, poly }, KLODSER, nyKrop,
 toScreen, moment, VIP_DAMP, VIP_GNID, VIP_MAX, G, H, BOM_T };

    },
    stop() {
      alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (cv) { cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerup", onUp); cv.removeEventListener("pointercancel", onUp); }
      if (lyd) { try { if (lyd.knirk) lyd.knirk.src.stop(); lyd.master.disconnect(); } catch (e) {} lyd = null; }
      W = null; beam = null; pointer = null; flyers = []; delete window.__vippetaarn;
    }
  });
})();
