// Spil: Find dyret — stemmen beder om et dyr, barnet trykker på det rigtige.
// 2 dyr i starten, 3 efter 5 stjerner, 4 efter 10. Efter 15 stjerner gemmer dyrene sig hver anden runde
// bag en busk, en kasse, en sky eller et træ, så kun en del af dem kan ses. Ballonfest for hver 5 stjerner.
(function () {
  const ANIMALS = [
    ["🐄", "koen", "ko", "muh"], ["🐈", "katten", "kat", "miav"], ["🐕", "hunden", "hund", "vov vov"],
    ["🐖", "grisen", "gris", "øf øf"], ["🦆", "anden", "and", "rap rap"], ["🐑", "fåret", "får", "mææh"],
    ["🐎", "hesten", "hest", "ihahaha"], ["🦁", "løven", "løve", "roaaar"], ["🐸", "frøen", "frø", "kvæk kvæk"],
    ["🦉", "uglen", "ugle", "uhu"], ["🐔", "hønen", "høne", "gok gok"], ["🐭", "musen", "mus", "pip pip"],
    ["🐘", "elefanten", "elefant", "trut"], ["🐒", "aben", "abe", "uh uh ah ah"], ["🐟", "fisken", "fisk", "blub blub"],
    ["🐝", "bien", "bi", "bzzz"], ["🐻", "bjørnen", "bjørn", "brum"], ["🐍", "slangen", "slange", "sssss"]
  ];
  const NEUTER = ["får", "bi"];
  // Hvordan et dyr gemmer sig på kortet, og hvilke skjul der passer til den side
  const GEM = { "v-top": ["busk", "busk", "kasse", "sky"], "v-bottom": ["kasse", "sky"], "v-left": ["trae", "busk"], "v-right": ["trae", "busk"] };
  const cap = s => s[0].toUpperCase() + s.slice(1);

  // Skjulene tegnes som SVG i skjulets boks (i % af kortet: 108×62 / 108×50 / 62×108).
  // "d" er afstanden fra den åbne kant (den side hvor dyret kigger frem), "x" er langs kanten.
  const BOKS = { "v-top": [108, 62], "v-bottom": [108, 50], "v-left": [62, 108], "v-right": [62, 108] };
  function tegnSkjul(hide, side) {
    const [W, H] = BOKS[side];
    const P = (x, d) => side === "v-top" ? [x, d] : side === "v-bottom" ? [x, H - d] : side === "v-left" ? [d, x] : [W - d, x];
    const C = (x, d, r, f) => { const [cx, cy] = P(x, d); return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"/>`; };
    const R = (d0, f) => { // fylder alt fra afstand d0 og indad
      const [x0, y0] = P(-10, d0), [x1, y1] = P(118, 140);
      return `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}" fill="${f}"/>`;
    };
    let g = "";
    if (hide === "busk") {
      const top = [[2, 22, 15], [20, 14, 17], [40, 9, 18], [60, 11, 18], [80, 9, 17], [98, 15, 16], [112, 22, 14]];
      g = R(20, "#3f8a3b") + top.map(([x, d, r]) => C(x, d + 2, r, "#3f8a3b")).join("")
        + top.map(([x, d, r]) => C(x, d, r - 2, "#5fae50")).join("")
        + top.map(([x, d, r]) => C(x - r * .3, d - r * .3, r * .45, "#8fd07a")).join("")
        + [[16, 36, 11], [46, 34, 12], [76, 36, 11], [100, 40, 10], [30, 50, 9], [62, 50, 10], [90, 54, 9]].map(([x, d, r]) => C(x, d, r, "#529f47")).join("")
        + [[28, 26], [70, 24], [52, 42], [92, 30]].map(([x, d]) => C(x, d, 2.6, "#e9506b")).join("");
    } else if (hide === "sky") {
      const top = [[4, 24, 16], [22, 16, 18], [44, 10, 21], [68, 12, 20], [90, 17, 18], [108, 24, 16]];
      g = R(20, "#b9d2ea") + top.map(([x, d, r]) => C(x, d, r + 1.6, "#b9d2ea")).join("")
        + R(22, "#fff") + top.map(([x, d, r]) => C(x, d, r, "#fff")).join("");
    } else if (hide === "kasse") {
      // Papkasse: den åbne kant har flapper, og en tapestrimmel går ned over midten
      const [bx0, by0] = P(4, 8), [bx1, by1] = P(104, 140);
      const box = `<rect x="${Math.min(bx0, bx1)}" y="${Math.min(by0, by1)}" width="${Math.abs(bx1 - bx0)}" height="${Math.abs(by1 - by0)}" rx="3" fill="#d39a5e"/>`;
      const poly = (pts, f) => `<polygon points="${pts.map(([x, d]) => P(x, d).join(",")).join(" ")}" fill="${f}"/>`;
      g = (side === "v-top" ? poly([[6, 8], [0, 1], [40, 3], [52, 8]], "#e2b07a") + poly([[56, 8], [68, 2], [108, 1], [102, 8]], "#e2b07a") : "")
        + box + poly([[4, 8], [104, 8], [104, 15], [4, 15]], "#b97f45")
        + poly([[47, 15], [61, 15], [61, 140], [47, 140]], "#ecc998")
        + poly([[14, 26], [36, 26], [36, 30], [14, 30]], "#b97f45") + poly([[72, 26], [94, 26], [94, 30], [72, 30]], "#b97f45");
    } else { // trae: stamme med bark, et knasthul og en trækrone foroven
      const bark = [16, 26, 38, 50].map(x => { const [a] = P(0, 4 + x * .9); return `<path d="M${a} 18 q3 20 0 40 t0 50" stroke="#7a4c24" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; }).join("");
      const [kx] = P(0, 30), [sx0] = P(0, 6), [sx1] = P(0, 62);
      const krone = [[4, 16, 13], [22, 6, 15], [42, 2, 15], [60, 6, 14], [14, 28, 11], [36, 22, 13], [56, 24, 12]];
      g = `<rect x="${Math.min(sx0, sx1)}" y="-10" width="${Math.abs(sx1 - sx0)}" height="130" fill="#9b6334"/>`
        + `<rect x="${side === "v-left" ? 50 : 0}" y="-10" width="12" height="130" fill="#87532a"/>` + bark
        + `<ellipse cx="${kx}" cy="64" rx="7" ry="9" fill="#7a4c24"/><ellipse cx="${kx}" cy="65" rx="4.5" ry="6.5" fill="#4a2c12"/>`
        + krone.map(([d, y, r]) => { const [cx] = P(0, d); return `<circle cx="${cx}" cy="${y + 2}" r="${r}" fill="#3f8a3b"/>`; }).join("")
        + krone.map(([d, y, r]) => { const [cx] = P(0, d); return `<circle cx="${cx}" cy="${y}" r="${r - 2}" fill="#5fae50"/>`; }).join("")
        + krone.map(([d, y, r]) => { const [cx] = P(0, d - r * .3); return `<circle cx="${cx}" cy="${y - r * .3}" r="${r * .42}" fill="#8fd07a"/>`; }).join("");
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`;
  }

  Spil.css("css-find-dyret", `
    .fd{height:100%;display:flex;flex-direction:column;gap:2vh;box-sizing:border-box;padding-block:2vh 3vh;
      padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
      position:relative;overflow:hidden;
      background:radial-gradient(120% 60% at 50% 110%,var(--meadow-deep) 0 45%,transparent 46%),linear-gradient(#bfe6fb,var(--meadow) 38%)}
    .fd::after{content:"🌼  🌷  🌼  🌸  🌼";position:absolute;left:0;right:0;bottom:1.5vh;text-align:center;white-space:pre;font-size:clamp(18px,min(4vh,7vw),36px);
      letter-spacing:.3em;opacity:.9;pointer-events:none}
    .fd-top{display:flex;align-items:center;justify-content:center;gap:12px;min-height:clamp(56px,9vh,84px)}
    .fd-stars{display:flex;gap:6px;font-size:clamp(22px,min(4.5vh,6vw),44px)}
    .fd-stars span{opacity:.75;filter:grayscale(1) brightness(1.9) drop-shadow(0 2px 0 rgba(31,58,95,.25));transition:transform .3s,opacity .3s,filter .3s}
    .fd-stars span.on{opacity:1;filter:drop-shadow(0 2px 0 rgba(150,100,0,.35));transform:scale(1.15)}
    .fd-speak{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(56px,9vh,84px);aspect-ratio:1;border-radius:50%;background:var(--sun);box-shadow:0 6px 0 #d9a21a;font-size:clamp(26px,4.5vh,40px)}
    .fd-speak:active{transform:translateY(4px);box-shadow:0 2px 0 #d9a21a}
    .fd-prompt{text-align:center;font-weight:800;font-size:clamp(34px,min(7vh,13vw),72px);line-height:1.05;text-wrap:balance;min-height:1.1em;position:relative;z-index:1}
    /* Himmel med to skyer, en bakke bagved og en græsbakke foran (erstatter den flade baggrund i .fd ovenfor) */
    .fd{background:radial-gradient(circle 20px at calc(10% + -30px) calc(24% + 6px),#fffc 97%,transparent 100%),radial-gradient(circle 28px at calc(10% + -4px) calc(24% + -6px),#fffc 97%,transparent 100%),radial-gradient(circle 21px at calc(10% + 26px) calc(24% + 6px),#fffc 97%,transparent 100%),radial-gradient(58px 16px at 10% calc(24% + 14px),#fffc 97%,transparent 100%),
        radial-gradient(circle 16px at calc(90% + -24px) calc(30% + 5px),#fffc 97%,transparent 100%),radial-gradient(circle 22px at calc(90% + -3px) calc(30% + -5px),#fffc 97%,transparent 100%),radial-gradient(circle 17px at calc(90% + 21px) calc(30% + 5px),#fffc 97%,transparent 100%),radial-gradient(46px 13px at 90% calc(30% + 11px),#fffc 97%,transparent 100%),
        radial-gradient(120% 60% at 50% 110%,var(--meadow-deep) 0 45%,transparent 46%),
        radial-gradient(70% 34% at 8% 84%,#cdebb4 0 60%,transparent 61%),radial-gradient(70% 30% at 95% 86%,#cdebb4 0 60%,transparent 61%),
        linear-gradient(#a9dcf7,#d4eefb 30%,var(--meadow) 52%)}
    .fd-grid{position:relative;z-index:1;flex:1;min-height:0;display:grid;gap:clamp(12px,2.5vh,28px);align-content:center;justify-content:center}
    .fd-card{background:var(--card);border-radius:28px;box-shadow:0 8px 0 var(--shadow);display:grid;place-items:center;
      font-size:clamp(70px,16vh,170px);line-height:1.3;aspect-ratio:1;width:100%;max-width:100%;transition:transform .15s,opacity .3s;
      overflow:visible;padding:0;animation:fd-bob 2.4s ease-in-out infinite alternate}
    .fd-card:nth-child(2n){animation-delay:-1.2s}.fd-card:nth-child(3n){animation-delay:-.6s}
    .fd-card:nth-child(4n+1){background:#fff8e6}.fd-card:nth-child(4n+2){background:#eefaff}.fd-card:nth-child(4n+3){background:#fff0f6}.fd-card:nth-child(4n){background:#f1ffe9}
    @keyframes fd-bob{to{transform:translateY(-6px)}}
    .fd-card:active{transform:scale(.95)}
    .fd-card.wrong{animation:fd-shake .45s}
    .fd-card.right{animation:fd-hop .7s;background:#fff3c4!important;box-shadow:0 8px 0 #e3b630}
    .fd-card.dim{opacity:.35}
    @keyframes fd-shake{20%,60%{transform:translateX(-12px) rotate(-4deg)}40%,80%{transform:translateX(12px) rotate(4deg)}}
    @keyframes fd-hop{30%{transform:translateY(-30px) scale(1.12)}60%{transform:translateY(0) scale(.96)}}
    .fd-party{position:fixed;inset:0;background:var(--sky);overflow:hidden;z-index:5;display:flex;align-items:center;justify-content:center;text-align:center}
    /* Ballonerne: glans, en lille knude og snoren hænger fra knuden (resten står i index.html) */
    .fd-party{background:radial-gradient(circle 24px at calc(20% + -34px) calc(20% + 8px),#fff 97%,transparent 100%),radial-gradient(circle 34px at calc(20% + -4px) calc(20% + -6px),#fff 97%,transparent 100%),radial-gradient(circle 26px at calc(20% + 30px) calc(20% + 6px),#fff 97%,transparent 100%),radial-gradient(70px 20px at 20% calc(20% + 16px),#fff 97%,transparent 100%),
      radial-gradient(circle 24px at calc(80% + -34px) calc(13% + 8px),#fff 97%,transparent 100%),radial-gradient(circle 34px at calc(80% + -4px) calc(13% + -6px),#fff 97%,transparent 100%),radial-gradient(circle 26px at calc(80% + 30px) calc(13% + 6px),#fff 97%,transparent 100%),radial-gradient(70px 20px at 80% calc(13% + 16px),#fff 97%,transparent 100%),
      linear-gradient(var(--sky),#bfe6fb)}
    .fd-party .balloon{background-image:radial-gradient(circle at 32% 28%,rgba(255,255,255,.75) 0 9%,rgba(255,255,255,0) 22%),
      radial-gradient(circle at 60% 70%,rgba(0,0,0,0) 45%,rgba(0,0,0,.14) 75%)!important;border-radius:50% 50% 48% 48%/56% 56% 44% 44%}
    .fd-party .balloon::before{content:"";position:absolute;left:50%;top:99%;width:14%;aspect-ratio:1.2;transform:translateX(-50%);
      background:inherit;background-image:none!important;clip-path:polygon(50% 0,100% 100%,0 100%);filter:brightness(.85)}
    .fd-party .balloon::after{top:calc(100% + 6%);height:9vh;width:2px;background:rgba(255,255,255,.85)}
    .fd-party p{margin:0;font-weight:800;font-size:clamp(36px,7vh,70px);color:#fff;text-shadow:0 4px 0 #3b8fc0;position:relative;z-index:2;pointer-events:none}
    /* Gemte dyr: dyret ses kun halvt, resten er dækket af et skjul, der flytter sig ved rigtigt svar */
    .fd-card.gem{position:relative;overflow:hidden}
    .fd-a{display:block;line-height:1;transition:clip-path .45s ease-out}
    .fd-hide{position:absolute;transition:transform .5s ease-in,opacity .25s ease-in .25s;filter:drop-shadow(0 6px 8px rgba(31,58,95,.2))}
    .v-top .fd-a{clip-path:inset(0 0 50% 0)}
    .v-top .fd-hide{top:44%;left:-4%;right:-4%;bottom:-6%}
    .v-bottom .fd-a{clip-path:inset(50% 0 0 0)}
    .v-bottom .fd-hide{top:-6%;bottom:44%;left:-4%;right:-4%}
    .v-left .fd-a{clip-path:inset(0 50% 0 0)}
    .v-left .fd-hide{top:-4%;bottom:-4%;left:44%;right:-6%}
    .v-right .fd-a{clip-path:inset(0 0 0 50%)}
    .v-right .fd-hide{top:-4%;bottom:-4%;left:-6%;right:44%}
    .fd-hide svg{display:block;width:100%;height:100%;overflow:visible}
    .fd-card.reveal .fd-a{clip-path:inset(0 0 0 0)}
    .fd-card.reveal .fd-hide{transform:translateY(90%) rotate(-12deg) scale(.7);opacity:0}
    @media (prefers-reduced-motion:reduce){.fd-card,.fd-card.right,.fd-card.wrong{animation:none}.fd-a,.fd-hide{transition:none}}
  `);

  let root, score, target, busy, last, alive, timers, rounds, warned, skjulTest;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = sel => root.querySelector(sel);
  const K = a => Spil.key(a[2]); // lydfil-nøgle, fx "faar"
  // Ikke mens "Ja! ..." siges: et nyt say ville afbryde replikken, og så kom næste runde aldrig
  const ask = () => target && !busy && Spil.say(`Find ${target[1]}!`, null, `find-${K(target)}`);

  function drawStars() {
    const on = score % 5 === 0 && score > 0 && busy ? 5 : score % 5;
    q(".fd-stars").innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < on ? "on" : ""}">⭐</span>`).join("");
  }
  const count = () => score < 5 ? 2 : score < 10 ? 3 : 4;
  const hiding = () => score >= 15 && rounds % 2 === 0;

  function round() {
    if (!alive) return;
    busy = false; drawStars(); rounds++;
    const gem = hiding(), n = gem ? 3 : count();
    const opts = Spil.shuffle(ANIMALS.filter(a => !last.includes(a))).slice(0, n);
    target = opts[Math.random() * n | 0]; last = [target];
    q(".fd-prompt").textContent = `Find ${target[1]}!`;
    const g = q(".fd-grid"); g.innerHTML = "";
    opts.forEach(a => {
      const b = document.createElement("button"); b.className = "fd-card";
      if (gem) {
        const sides = Object.keys(GEM).filter(k => !skjulTest || GEM[k].includes(skjulTest)), side = sides[Math.random() * sides.length | 0];
        const hide = skjulTest || GEM[side][Math.random() * GEM[side].length | 0];
        b.classList.add("gem", side);
        b.innerHTML = `<span class="fd-a">${a[0]}</span><i class="fd-hide ${hide}">${tegnSkjul(hide, side)}</i>`;
      } else b.textContent = a[0];
      b.setAttribute("aria-label", a[2]); b.onclick = () => choose(b, a); g.appendChild(b);
    });
    layout();
    if (gem && !warned) { warned = true; Spil.say(`Nu gemmer dyrene sig! Find ${target[1]}!`, null, ["find-gemmer", `find-${K(target)}`]); }
    else ask();
  }

  function choose(btn, a) {
    if (busy) return;
    if (a === target) {
      busy = true; score++; btn.classList.add("right", "reveal");
      [...q(".fd-grid").children].forEach(c => c !== btn && c.classList.add("dim"));
      Spil.sfx.right(); Spil.burstAt(btn); drawStars();
      // Vent til stemmen er færdig + en lille pause, før næste dyr
      Spil.say(K(target) === "bjoern" ? "Ja! Det er en bjørn!" : `Ja! ${cap(target[1])} siger ${target[3]}!`, () => later(() => score % 5 === 0 ? party() : round(), 700), Spil.jaDyr(K(target)));
    } else {
      btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong"); Spil.sfx.wrong();
      Spil.say(`Det er ${NEUTER.includes(a[2]) ? "et" : "en"} ${a[2]}. Find ${target[1]}!`, null, [`er-${K(a)}`, `find-${K(target)}`]);
    }
  }

  function party() {
    const p = document.createElement("div"); p.className = "fd-party"; p.innerHTML = "<p>Pop ballonerne!</p>";
    root.appendChild(p);
    Spil.sfx.fanfare(); Spil.say("Super flot! Pop ballonerne!", null, "super-pop");
    const cols = ["#ff6b6b", "#ffc93c", "#6bcb77", "#4d96ff", "#c77dff", "#ff9f43"]; let left = 12;
    let over = false;
    const end = () => { if (over) return; over = true; later(() => { p.remove(); round(); }, 600); };
    const done = () => { if (--left === 0) end(); };
    later(end, 16000); // reserve, så festen altid slutter
    for (let i = 0; i < 12; i++) {
      const b = document.createElement("button"); b.className = "balloon"; b.setAttribute("aria-label", "Ballon");
      b.style.background = cols[i % cols.length]; b.style.left = `calc((100% - clamp(80px,14vh,140px)) * ${(.03 + Math.random() * .94).toFixed(3)})`; // hele ballonen på skærmen
      b.style.animationDuration = (5 + Math.random() * 4) + "s"; b.style.animationDelay = (i * .45) + "s";
      b.onpointerdown = () => { if (b.classList.contains("pop")) return; b.classList.add("pop"); Spil.sfx.pop(); done(); };
      b.onanimationend = e => { if (e.animationName === "rise") { b.remove(); done(); } else b.remove(); };
      p.appendChild(b);
    }
  }

  function layout() {
    if (!alive) return;
    const g = q(".fd-grid"), n = g.children.length; if (!n) return;
    // Vælg det antal kolonner, der giver de største kort i den plads, gitteret faktisk har
    g.style.gridTemplateColumns = ""; const gap = parseFloat(getComputedStyle(g).rowGap) || 16;
    const W = Math.min(g.clientWidth, innerWidth - 40), H = Math.min(g.clientHeight - innerHeight * .06, innerHeight * .6); // luft til skygge og blomster
    let cols = 1, size = 0, best = 0;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), s = Math.min((W - (c - 1) * gap) / c, (H - (r - 1) * gap) / r);
      const v = r * c > n ? s * .85 : s; // et hul i gitteret ser skævt ud, så kun hvis kortene bliver meget større
      if (v > best) { best = v; size = s; cols = c; }
    }
    g.style.gridTemplateColumns = `repeat(${cols},${Math.floor(size)}px)`;
    [...g.children].forEach(b => b.style.fontSize = Math.floor(size * .56) + "px"); // dyret fylder kortet, uden at blive klippet
  }

  Spil.register({
    id: "find-dyret", navn: "Find dyret", ikon: "🐄", farve: "var(--meadow-deep)",
    start(r) {
      Spil.preload(["super-pop", "find-gemmer", ...ANIMALS.flatMap(a => ["find-", "er-"].map(p => p + K(a)).concat(Spil.jaDyr(K(a))))]);
      root = r; score = 0; target = null; busy = false; last = []; alive = true; timers = []; rounds = 0; warned = false; skjulTest = "";
      // Dybe links til test (index.html?spil=find-dyret&dyb=...): "tre" / "fire" = 3 eller 4 dyr,
      // "gem" = dyrene gemmer sig, "gem-busk" / "gem-kasse" / "gem-sky" / "gem-trae" = kun det skjul, "fest" = ballonfest
      const dyb = Spil.dyb || "";
      if (dyb === "tre") score = 5;
      if (dyb === "fire") score = 10;
      if (dyb.startsWith("gem")) { score = 15; rounds = 1; skjulTest = ["busk", "kasse", "sky", "trae"].find(k => dyb === "gem-" + k) || ""; }
      if (dyb === "fest") score = 5;
      root.innerHTML = `<div class="fd">
        <div class="fd-top"><div class="fd-stars" aria-label="Stjerner"></div></div>
        <button class="fd-speak" aria-label="Sig det igen">🔊</button>
        <div class="fd-prompt"></div>
        <div class="fd-grid"></div></div>`;
      q(".fd-speak").onclick = ask; q(".fd-prompt").onclick = ask;
      addEventListener("resize", layout);
      if (dyb === "fest") { drawStars(); party(); } else round();
    },
    stop() { alive = false; timers.forEach(clearTimeout); removeEventListener("resize", layout); }
  });
})();
