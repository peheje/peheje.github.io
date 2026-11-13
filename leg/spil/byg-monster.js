// Spil: Byg et monster — vælg krop, farve, øjne, mund, top, arme og mønster. Intet rigtigt eller forkert.
// "Færdig" gør monsteret levende: det danser, siger sit navn og bliver fotograferet til galleriet (huskes på enheden).
(function () {
  /* ---------- Dele ---------- */
  const FARVER = [
    ["groen", "#5cc46b", "#2f8a3e", "grøn"], ["lilla", "#b57dff", "#6a35b8", "lilla"], ["blaa", "#4d96ff", "#1f5bb8", "blå"],
    ["orange", "#ff9f43", "#b85e10", "orange"], ["lyseroed", "#ff7fbf", "#c2407f", "lyserød"], ["gul", "#ffd23f", "#b8900a", "gul"],
    ["roed", "#ff5c5c", "#b72d2d", "rød"],
  ];
  // Kropsformer med ankerpunkter til øjne, mund, top og arme (viewBox 0 -70 300 350)
  const KROPPE = {
    rund: { d: "M150 70 C212 70 250 115 250 170 C250 228 208 262 150 262 C92 262 50 228 50 170 C50 115 88 70 150 70 Z", top: 72, eyeY: 140, mouthY: 200, armY: 175, half: 98, spread: 44 },
    hoej: { d: "M150 30 C200 30 222 90 222 150 C222 220 196 262 150 262 C104 262 78 220 78 150 C78 90 100 30 150 30 Z", top: 32, eyeY: 100, mouthY: 170, armY: 165, half: 72, spread: 32 },
    blob: { d: "M150 62 C190 50 230 80 240 120 C262 150 258 210 225 240 C195 268 110 270 78 245 C40 215 38 160 58 120 C72 88 110 68 150 62 Z", top: 62, eyeY: 135, mouthY: 198, armY: 178, half: 96, spread: 44 },
    paere: { d: "M150 48 C188 48 198 96 204 128 C250 158 252 262 150 262 C48 262 50 158 96 128 C102 96 112 48 150 48 Z", top: 50, eyeY: 100, mouthY: 200, armY: 190, half: 92, spread: 26, hair: 34 },
  };
  const CATS = [
    { k: "krop", navn: "Krop", valg: ["rund", "hoej", "blob", "paere"] },
    { k: "farve", navn: "Farve", valg: FARVER.map(f => f[0]) },
    { k: "oejne", navn: "Øjne", valg: ["1", "2", "3", "mange"] },
    { k: "mund", navn: "Mund", valg: ["smil", "taender", "tunge", "o"] },
    { k: "top", navn: "Horn og ører", valg: ["horn", "oerer", "antenner", "haar"] },
    { k: "arme", navn: "Arme", valg: ["korte", "lange", "tentakler", "vinger"] },
    { k: "moenster", navn: "Mønster", valg: ["ingen", "prikker", "striber", "stjerner"] },
  ];
  // Reservetekst hvis en lydfil mangler (samme sætninger som lyd_monster.py)
  const TXT = {
    "krop-rund": "En rund krop!", "krop-hoej": "En høj krop!", "krop-blob": "En blød blob!", "krop-paere": "En pæreformet krop!",
    "oejne-1": "Et stort øje!", "oejne-2": "To øjne!", "oejne-3": "Tre øjne!", "oejne-mange": "Mange øjne!",
    "mund-smil": "Et stort smil!", "mund-taender": "Store tænder!", "mund-tunge": "Ræk tunge!", "mund-o": "En rund mund!",
    "top-horn": "Store horn!", "top-oerer": "Lange ører!", "top-antenner": "Antenner!", "top-haar": "Pjusket hår!",
    "arme-korte": "Korte arme!", "arme-lange": "Lange arme!", "arme-tentakler": "Tentakler!", "arme-vinger": "Vinger!",
    "moenster-prikker": "Prikker!", "moenster-striber": "Striber!", "moenster-stjerner": "Stjerner!", "moenster-ingen": "Helt glat!",
  };
  const NAVNE = ["Blubbo", "Snuffeluf", "Grumle", "Fnisefis", "Bobbel", "Mumle", "Slimbo", "Pjuske", "Krumme", "Vimse"];
  const NY = () => ({ krop: "rund", farve: "groen", oejne: "2", mund: "smil", top: null, arme: "korte", moenster: "ingen" });
  const D = "#1f3a5f";
  const FOTO = "-30 -50 360 345"; // udsnit til fotos i galleriet: plads til vinger, tentakler og antenner
  let uid = 0;

  const eye = (x, y, r) => `<g class="mo-eye" style="transform-origin:${x}px ${y}px">
    <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${D}" stroke-width="4"/>
    <circle cx="${x + r * .15}" cy="${y + r * .1}" r="${r * .55}" fill="${D}"/>
    <circle cx="${x + r * .35}" cy="${y - r * .2}" r="${r * .2}" fill="#fff"/></g>`;
  const mirror = s => `<g transform="translate(300,0) scale(-1,1)">${s}</g>`;

  function eyes(n, b) {
    const y = b.eyeY, s = b.spread;
    if (n === "1") return eye(150, y, 34);
    if (n === "2") return eye(150 - s, y, 22) + eye(150 + s, y, 22);
    if (n === "3") return eye(150, y - 20, 18) + eye(150 - s - 6, y + 10, 18) + eye(150 + s + 6, y + 10, 18);
    return [[-1.5, 12], [-.75, -8], [0, -16], [.75, -8], [1.5, 12]].map(([f, dy]) => eye(150 + f * s * .95, y + dy, 13)).join("");
  }

  function mouth(k, b) {
    const y = b.mouthY;
    if (k === "smil") return `<path d="M112 ${y - 6} Q150 ${y + 46} 188 ${y - 6} Q150 ${y + 8} 112 ${y - 6} Z" fill="#7a1f2b" stroke="${D}" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="150" cy="${y + 20}" rx="13" ry="6" fill="#ff8fa3"/>`;
    if (k === "taender") return `<path d="M108 ${y - 10} Q150 ${y + 52} 192 ${y - 10} Z" fill="#7a1f2b" stroke="${D}" stroke-width="4" stroke-linejoin="round"/>
      <path d="${[118, 135, 152, 169].map(x => `M${x} ${y - 9} l8 15 l8 -15 Z`).join(" ")} M134 ${y + 26} l6 -13 l6 13 Z M156 ${y + 26} l6 -13 l6 13 Z" fill="#fff" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`;
    if (k === "tunge") return `<path d="M124 ${y} Q150 ${y + 18} 176 ${y}" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/>
      <path d="M139 ${y + 8} C139 ${y + 42} 163 ${y + 42} 163 ${y + 8} Z" fill="#ff6b8b" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M151 ${y + 13} L151 ${y + 28}" stroke="#c2405f" stroke-width="2.5" stroke-linecap="round"/>`;
    return `<ellipse cx="150" cy="${y + 8}" rx="18" ry="22" fill="#7a1f2b" stroke="${D}" stroke-width="4"/>`;
  }

  function top(k, b, c) {
    const t = b.top, [, col, dk] = c;
    let p;
    if (k === "horn") p = `<path d="M124 ${t + 18} C114 ${t - 12} 104 ${t - 30} 90 ${t - 48} C116 ${t - 42} 136 ${t - 18} 142 ${t + 12} Z" fill="#fff3d6" stroke="${dk}" stroke-width="4" stroke-linejoin="round"/>`;
    else if (k === "oerer") p = `<g transform="rotate(-16 124 ${t - 22})"><ellipse cx="124" cy="${t - 22}" rx="16" ry="44" fill="${col}" stroke="${dk}" stroke-width="4"/>
      <ellipse cx="124" cy="${t - 22}" rx="7" ry="30" fill="#ffc2d6"/></g>`;
    else if (k === "antenner") p = `<path d="M138 ${t + 12} Q128 ${t - 30} 110 ${t - 52}" fill="none" stroke="${dk}" stroke-width="5" stroke-linecap="round"/>
      <circle class="mo-bob" cx="108" cy="${t - 56}" r="11" fill="#ffd23f" stroke="${dk}" stroke-width="4"/>`;
    else { // håret følger hovedets bredde, så det ikke stikker ud til siderne på en smal top (pæren)
      const f = (b.hair || 54) / 54, pt = [[-54, 34], [-44, -16], [-28, 10], [-14, -30], [0, 6], [14, -30], [28, 10], [44, -16], [54, 34]];
      return `<path d="M${pt.map(([x, y]) => `${(150 + x * f).toFixed(1)} ${t + y}`).join(" L")} Z" fill="${dk}" stroke="${dk}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    return p + mirror(p);
  }

  function arms(k, b, c) {
    const y = b.armY, x = 150 - b.half + 14, [, col, dk] = c;
    const noodle = d => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="24" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="15" stroke-linecap="round"/>`;
    let L;
    if (k === "korte") L = `<ellipse cx="${x - 24}" cy="${y}" rx="30" ry="16" transform="rotate(-25 ${x - 24} ${y})" fill="${col}" stroke="${dk}" stroke-width="4"/>`;
    else if (k === "lange") L = noodle(`M${x} ${y} Q${x - 50} ${y + 6} ${x - 62} ${y - 60}`) + `<circle cx="${x - 62}" cy="${y - 66}" r="14" fill="${col}" stroke="${dk}" stroke-width="4"/>`;
    else if (k === "tentakler") L = noodle(`M${x} ${y - 10} C${x - 40} ${y} ${x - 30} ${y + 40} ${x - 66} ${y + 46}`) + noodle(`M${x + 6} ${y + 16} C${x - 26} ${y + 32} ${x - 16} ${y + 70} ${x - 48} ${y + 80}`);
    else L = `<path d="M${x + 12} ${y - 58} C${x - 40} ${y - 120} ${x - 92} ${y - 92} ${x - 82} ${y - 30} C${x - 62} ${y - 50} ${x - 44} ${y - 22} ${x - 32} ${y - 42} C${x - 22} ${y - 12} ${x} ${y - 12} ${x + 16} ${y - 22} Z" fill="#fff" fill-opacity=".88" stroke="${dk}" stroke-width="4" stroke-linejoin="round"/>`;
    return `<g class="mo-arm mo-al" style="transform-origin:${x}px ${y}px">${L}</g>
      <g class="mo-arm mo-ar" style="transform-origin:${300 - x}px ${y}px">${mirror(L)}</g>`;
  }

  function pattern(k, c) {
    const [, , dk] = c;
    if (k === "prikker") {
      let s = "";
      for (let y = 50, r = 0; y < 270; y += 34, r++) for (let x = 40 + (r % 2) * 17; x < 270; x += 34) s += `<circle cx="${x}" cy="${y}" r="8"/>`;
      return `<g fill="#fff" opacity=".35">${s}</g>`;
    }
    if (k === "striber") {
      let s = "";
      for (let y = 40; y < 280; y += 34) s += `<path d="M30 ${y} Q90 ${y - 14} 150 ${y} T270 ${y}"/>`;
      return `<g fill="none" stroke="${dk}" stroke-width="11" opacity=".28">${s}</g>`;
    }
    if (k === "stjerner") {
      const star = (x, y, r) => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; return `${i ? "L" : "M"}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(" ")} Z"/>`;
      return `<g fill="#fff" opacity=".55">${[[80, 110, 11], [215, 100, 9], [60, 200, 10], [230, 210, 12], [120, 250, 8], [190, 255, 9], [150, 60, 8], [100, 160, 7], [205, 160, 7]].map(a => star(...a)).join("")}</g>`;
    }
    return "";
  }

  function svg(m, cls = "", vb = "0 -70 300 350") {
    const b = KROPPE[m.krop], c = FARVER.find(f => f[0] === m.farve), id = "mo-c" + (uid++), [, col, dk] = c;
    return `<svg class="mo-svg ${cls}" viewBox="${vb}" aria-hidden="true">
      <defs><clipPath id="${id}"><path d="${b.d}"/></clipPath></defs>
      <ellipse cx="150" cy="272" rx="112" ry="13" fill="#6a35b8" opacity=".14"/>
      <g class="mo-all">
        <g data-p="arme">${arms(m.arme, b, c)}</g>
        <g data-p="top">${m.top ? top(m.top, b, c) : ""}</g>
        <ellipse cx="108" cy="262" rx="30" ry="14" fill="${dk}"/><ellipse cx="192" cy="262" rx="30" ry="14" fill="${dk}"/>
        <g data-p="krop">
          <path d="${b.d}" fill="${col}" stroke="${dk}" stroke-width="5" stroke-linejoin="round"/>
          <g clip-path="url(#${id})"><g data-p="moenster">${pattern(m.moenster, c)}</g>
            <ellipse cx="150" cy="${b.mouthY + 44}" rx="${b.half * .55}" ry="34" fill="#fff" opacity=".22"/></g>
        </g>
        <circle cx="${150 - b.spread - 30}" cy="${b.mouthY - 8}" r="12" fill="#ff7f9f" opacity=".45"/>
        <circle cx="${150 + b.spread + 30}" cy="${b.mouthY - 8}" r="12" fill="#ff7f9f" opacity=".45"/>
        <g data-p="oejne">${eyes(m.oejne, b)}</g>
        <g data-p="mund" class="mo-mouth" style="transform-origin:150px ${b.mouthY}px">${mouth(m.mund, b)}</g>
      </g></svg>`;
  }

  Spil.css("css-byg-monster", `
    .mo{position:relative;height:100%;overflow:hidden;display:flex;flex-direction:column;
      background:radial-gradient(circle,rgba(255,255,255,.7) 0 3px,transparent 4px) 0 0/46px 46px,linear-gradient(#ffe0f0,#e4e2ff)}
    .mo-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding-top:calc(1vh + env(safe-area-inset-top,0px))}
    .mo-mon{position:relative;z-index:1;height:min(100%,62vh);max-width:86vw;aspect-ratio:300/350;background:none;padding:0}
    .mo-svg{display:block;width:100%;height:100%;overflow:visible}
    .mo-all{transform-box:view-box;transform-origin:150px 262px;animation:mo-breathe 2.6s ease-in-out infinite}
    @keyframes mo-breathe{50%{transform:scale(1.02,.98)}}
    .mo-eye{transform-box:view-box;animation:mo-blink 3.6s infinite}
    @keyframes mo-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
    .mo-arm{transform-box:view-box;animation:mo-wl 1.4s ease-in-out infinite alternate}
    .mo-ar{animation-name:mo-wr}
    @keyframes mo-wl{to{transform:rotate(10deg)}}
    @keyframes mo-wr{to{transform:rotate(-10deg)}}
    .mo-bob{transform-box:fill-box;transform-origin:center;animation:mo-bob 1s ease-in-out infinite alternate}
    @keyframes mo-bob{to{transform:translateY(-6px)}}
    .mo-pop{transform-box:fill-box;transform-origin:center;animation:mo-pop .45s cubic-bezier(.3,1.7,.5,1)}
    @keyframes mo-pop{from{transform:scale(.2);opacity:0}}
    .mo-svg.wiggle .mo-all{animation:mo-wiggle .6s}
    @keyframes mo-wiggle{20%{transform:rotate(-6deg) scale(1.04)}50%{transform:rotate(5deg) scale(.97,1.05)}80%{transform:rotate(-3deg)}}
    .mo-svg.giggle .mo-mouth{transform-box:view-box;animation:mo-giggle .14s 5 alternate}
    @keyframes mo-giggle{to{transform:scale(1.25,.8)}}
    .mo-svg.dance .mo-all{animation:mo-dance .7s ease-in-out infinite}
    @keyframes mo-dance{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-8%) rotate(-7deg)}50%{transform:translateY(0) scale(1.05,.95)}75%{transform:translateY(-8%) rotate(7deg)}}
    .mo-svg.mini *{animation:none!important}
    .mo-name{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:3;font-weight:800;
      font-size:clamp(34px,7vh,72px);color:#fff;text-shadow:0 4px 0 rgba(106,53,184,.45);white-space:nowrap;pointer-events:none}
    .mo-name.pulse{animation:mo-name .5s cubic-bezier(.3,1.6,.5,1)}
    @keyframes mo-name{from{transform:translateX(-50%) scale(.3);opacity:0}}
    .mo-opts{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,1.6vw,16px);padding:0 16px 1.2vh}
    .mo-opt{width:clamp(64px,12vh,110px);aspect-ratio:1;border-radius:22px;background:#fff;padding:4px;box-shadow:0 5px 0 rgba(106,53,184,.22);display:grid;place-items:center}
    .mo-opt.on{background:var(--sun);box-shadow:0 5px 0 #d9a21a}
    .mo-opt:active{transform:translateY(4px)}
    .mo-opt .mo-svg{width:100%;height:100%;overflow:hidden;border-radius:16px}
    .mo-swatch{width:72%;aspect-ratio:1;border-radius:50%;border:4px solid rgba(0,0,0,.15)}
    .mo-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,1.6vw,18px);padding:0 16px calc(1.8vh + env(safe-area-inset-bottom,0px))}
    .mo-cat{width:clamp(58px,10.5vh,96px);aspect-ratio:1;border-radius:24px;background:var(--card);font-size:clamp(28px,5.2vh,48px);box-shadow:0 6px 0 rgba(106,53,184,.25)}
    .mo-cat{display:grid;place-items:center;padding:0}
    .mo-ikon{width:70%;height:auto;aspect-ratio:1;display:block;overflow:visible}
    .mo-ikon .mo-eye{animation:none}
    .mo-cat.on{background:#c9b8ff;box-shadow:0 6px 0 #8a6ad9}
    .mo-cat:active{transform:translateY(4px)}
    .mo-done,.mo-new{position:absolute;z-index:4;right:max(4vw,16px);bottom:4%;width:clamp(80px,15vh,140px);aspect-ratio:1;border-radius:50%;
      font-size:clamp(38px,7vh,66px);background:radial-gradient(circle at 35% 30%,#9ff0a8,#3fb653 60%,#2a8a3b);box-shadow:0 8px 0 #1f6b2d}
    .mo-new{background:radial-gradient(circle at 35% 30%,#ffe6a0,#ffc93c 60%,#d9a21a);box-shadow:0 8px 0 #a87a10}
    .mo-done:active,.mo-new:active{transform:translateY(6px);box-shadow:0 2px 0 #1f6b2d}
    .mo-done::before,.mo-new::before{content:"";position:absolute;inset:-12px;border-radius:50%;border:5px solid rgba(255,255,255,.8);animation:mo-ring 1.4s ease-out infinite}
    @keyframes mo-ring{from{transform:scale(.9);opacity:1}to{transform:scale(1.3);opacity:0}}
    .mo-galbtn{position:absolute;z-index:6;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      width:clamp(52px,8vh,76px);aspect-ratio:1;border-radius:50%;background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.25);font-size:clamp(24px,4vh,36px)}
    .mo-galbtn.got{animation:mo-got .5s}
    @keyframes mo-got{40%{transform:scale(1.3)}}
    .mo-flash{position:absolute;inset:0;z-index:8;background:#fff;pointer-events:none;animation:mo-flash .6s ease-out forwards}
    @keyframes mo-flash{from{opacity:.95}to{opacity:0}}
    .mo-photo{position:fixed;z-index:30;background:#fff;padding:6px 6px 18px;border-radius:6px;box-shadow:0 8px 20px rgba(0,0,0,.25);pointer-events:none}
    .mo-gal{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;background:rgba(255,248,240,.97)}
    .mo-gal h2{margin:calc(2.5vh + env(safe-area-inset-top,0px)) 90px 1vh;text-align:center;font-weight:800;font-size:clamp(28px,5.5vh,52px)}
    .mo-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(120px,22vh,190px),1fr));gap:clamp(12px,2.5vw,26px);
      padding:1vh max(16px,3vw) calc(3vh + env(safe-area-inset-bottom,0px));align-content:start}
    .mo-card{width:100%;max-width:240px;justify-self:center;background:#fff;padding:8px 8px 6px;border-radius:10px;box-shadow:0 6px 14px rgba(31,58,95,.18);display:flex;flex-direction:column;align-items:center;gap:2px;font-weight:800;font-size:clamp(16px,2.6vh,24px)}
    .mo-card .mo-svg,.mo-photo .mo-svg{height:auto;aspect-ratio:360/345;overflow:hidden;background:linear-gradient(#ffe0f0,#e4e2ff);border-radius:6px}
    .mo-close{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));width:clamp(52px,8vh,76px);aspect-ratio:1;
      border-radius:50%;background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.25);font-size:clamp(24px,4vh,36px)}
    @media (orientation:portrait){
      .mo-mon{max-width:74vw}
      .mo-gal h2{font-size:clamp(24px,8vw,40px);margin-inline:84px}
      .mo-gal h2{margin-bottom:4.5vh}
      .mo-grid{grid-template-columns:repeat(auto-fill,minmax(min(150px,40vw),1fr))}
      .mo-name{top:calc(11vh + env(safe-area-inset-top,0px))}
      .mo-done,.mo-new{right:12px;bottom:2%;width:clamp(64px,19vw,100px);height:clamp(64px,19vw,100px);aspect-ratio:auto;padding:0;font-size:clamp(30px,9vw,48px)}
      .mo-opt{width:clamp(56px,min(12vh,19vw),110px);border-radius:18px}
      .mo-cat{width:clamp(48px,min(10vh,19vw),96px);border-radius:18px;font-size:clamp(24px,min(5vh,9vw),48px)}}
    @media (prefers-reduced-motion:reduce){.mo-all,.mo-eye,.mo-arm,.mo-bob,.mo-pop,.mo-svg.dance .mo-all,.mo-svg.wiggle .mo-all,.mo-done::before,.mo-new::before,.mo-name.pulse{animation:none!important}}
  `);

  let root, alive, timers, m, cat, phase, lastName, gallery, seq, dybTest;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);
  const load = () => { try { return JSON.parse(localStorage.getItem("lk-monstre")) || []; } catch (e) { return []; } };
  const save = () => { try { localStorage.setItem("lk-monstre", JSON.stringify(gallery)); } catch (e) {} };
  const anim = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const keyOf = (c, v) => c === "farve" ? `farve-${v}` : `monster-${c}-${v}`;
  const textOf = (c, v) => c === "farve" ? FARVER.find(f => f[0] === v)[3] : TXT[`${c}-${v}`];

  function render(changed) {
    q(".mo-mon").innerHTML = svg(m, phase === "alive" ? "dance" : "");
    if (changed) {
      const part = q(`.mo-mon [data-p="${changed === "farve" ? "krop" : changed}"]`);
      if (part) part.classList.add("mo-pop");
    }
  }

  // Tegnede ikoner til kategoriknapperne (i monsterets egen farve) i stedet for emoji
  function ikon(k) {
    const [, col, dk] = FARVER.find(f => f[0] === m.farve), st = `stroke="${dk}" stroke-width="5" stroke-linejoin="round"`;
    let s;
    if (k === "krop") s = `<path d="M50 12 C78 12 90 36 90 58 C90 80 74 92 50 92 C26 92 10 80 10 58 C10 36 22 12 50 12 Z" fill="${col}" ${st}/>
      <ellipse cx="50" cy="74" rx="22" ry="12" fill="#fff" opacity=".3"/>`;
    else if (k === "farve") s = `<path d="M50 10 C80 10 94 32 92 52 C90 68 74 64 68 72 C62 82 72 92 52 92 C24 92 8 72 8 50 C8 26 26 10 50 10 Z" fill="#f6e3c3" stroke="#b5895a" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="30" cy="38" r="9" fill="#ff5c5c"/><circle cx="52" cy="27" r="9" fill="#ffd23f"/><circle cx="74" cy="38" r="9" fill="#4d96ff"/><circle cx="28" cy="64" r="9" fill="#5cc46b"/><circle cx="50" cy="74" r="7" fill="#b57dff"/>`;
    else if (k === "oejne") s = eye(27, 50, 22) + eye(73, 50, 22);
    else if (k === "mund") s = `<path d="M14 34 Q50 92 86 34 Q50 52 14 34 Z" fill="#7a1f2b" stroke="${D}" stroke-width="5" stroke-linejoin="round"/>
      <ellipse cx="50" cy="62" rx="14" ry="7" fill="#ff8fa3"/>`;
    else if (k === "top") s = `${[1, -1].map(f => `<path d="M${50 - f * 28} 74 C${50 - f * 30} 50 ${50 - f * 34} 28 ${50 - f * 44} 8 C${50 - f * 20} 18 ${50 - f * 8} 44 ${50 - f * 6} 70 Z" fill="#fff3d6" ${st}/>`).join("")}
      <path d="M8 96 C8 46 92 46 92 96 Z" fill="${col}" ${st}/>`;
    else if (k === "arme") s = `<path d="M8 82 L44 82 Q66 82 66 60 L66 40" fill="none" stroke="${dk}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 82 L44 82 Q66 82 66 60 L66 40" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="66" cy="26" r="17" fill="${col}" ${st}/>`;
    else s = `<circle cx="50" cy="50" r="42" fill="${col}" ${st}/>
      <g fill="#fff" opacity=".75"><circle cx="34" cy="34" r="8"/><circle cx="66" cy="62" r="9"/><circle cx="34" cy="68" r="6"/>
      <path d="M64 18 L68 29 L80 29 L70 36 L74 47 L64 40 L54 47 L58 36 L48 29 L60 29 Z"/></g>`;
    return `<svg class="mo-ikon" viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
  }

  function drawBar() {
    q(".mo-bar").innerHTML = CATS.map(c => `<button class="mo-cat${cat === c.k ? " on" : ""}" data-k="${c.k}" aria-label="${c.navn}">${ikon(c.k)}</button>`).join("");
    root.querySelectorAll(".mo-cat").forEach(b => b.onclick = () => openCat(b.dataset.k));
  }

  // Valgknapperne viser et udsnit omkring den del, man vælger (øjne, mund, top), så forskellen kan ses
  function zoom(k) {
    const b = KROPPE[m.krop], box = (cy, w) => `${150 - w / 2} ${cy - w / 2} ${w} ${w}`;
    if (k === "oejne") return box(b.eyeY + 4, 170);
    if (k === "mund") return box(b.mouthY + 10, 116);
    if (k === "top") return box(b.top - 8, 190);
    return "-30 -70 360 350";
  }

  function openCat(k) {
    Spil.sfx.click();
    cat = cat === k ? null : k;
    drawBar();
    const box = q(".mo-opts");
    if (!cat) { box.innerHTML = ""; return; }
    const c = CATS.find(x => x.k === cat);
    box.innerHTML = c.valg.map(v => {
      const inner = cat === "farve"
        ? `<span class="mo-swatch" style="background:${FARVER.find(f => f[0] === v)[1]}"></span>`
        : svg({ ...m, [cat]: v }, "mini", zoom(cat));
      return `<button class="mo-opt${m[cat] === v ? " on" : ""}" data-v="${v}" aria-label="${textOf(cat, v)}">${inner}</button>`;
    }).join("");
    box.querySelectorAll(".mo-opt").forEach(b => b.onclick = () => choose(b.dataset.v));
  }

  function choose(v) {
    if (phase !== "build" || !cat) return;
    m[cat] = v;
    render(cat);
    root.querySelectorAll(".mo-opt").forEach(b => b.classList.toggle("on", b.dataset.v === v));
    if (cat === "farve") drawBar();
    Spil.sfx.pop(); Spil.tone([500 + Math.random() * 300, 900 + Math.random() * 300], .07);
    later(() => { const s = q(".mo-svg"); if (s) anim(s, "wiggle"); }, 120);
    Spil.say(textOf(cat, v), null, keyOf(cat, v));
  }

  function tickle() {
    const s = q(".mo-mon .mo-svg");
    if (phase === "alive") {
      if (lastName == null || seq) { anim(s, "wiggle"); Spil.tone([700, 1000], .06); return; } // ikke afbryd fotoscenen
      Spil.tone([700, 1000], .06);
      return Spil.say(`Jeg hedder ${NAVNE[lastName]}!`, null, `monster-navn-${lastName}`);
    }
    anim(s, "wiggle"); anim(s, "giggle");
    Spil.tone([700, 900, 700, 1000], .06);
    Spil.say("Hihi, det kilder!", null, "pleje-kilder");
  }

  function finish() {
    if (phase !== "build") return;
    phase = "alive"; cat = null; lastName = null;
    q(".mo-opts").innerHTML = ""; q(".mo-bar").hidden = true; q(".mo-done").hidden = true;
    render();
    Spil.sfx.fanfare(); Spil.burstAt(q(".mo-mon"), "🎉⭐✨💜🎉⭐✨💚");
    let n; do { n = Math.random() * NAVNE.length | 0; } while (gallery.length && n === gallery[0].n && NAVNE.length > 1);
    // Hvert trin går videre når replikken er færdig — eller efter en reserve-timer, hvis barnet afbryder den
    // (fx ved at trykke på monsteret eller galleriknappen), så fotoet og "nyt monster"-knappen altid kommer.
    seq = true;
    step("Se! Monsteret er levende!", "monster-lever", 300, 5000, () => {
      lastName = n;
      const nm = q(".mo-name"); nm.textContent = NAVNE[n]; anim(nm, "pulse");
      step(`Jeg hedder ${NAVNE[n]}!`, `monster-navn-${n}`, 400, 4000, () => {
        step("Smil til kameraet!", "monster-foto", 300, 4000, () => { photo(n); });
      });
    });
  }
  function step(txt, key, gap, maxMs, next) {
    let go = false;
    const onward = () => { if (!go) { go = true; later(next, gap); } };
    Spil.say(txt, onward, key); later(onward, maxMs);
  }

  function photo(n) {
    const f = document.createElement("div"); f.className = "mo-flash"; root.appendChild(f); setTimeout(() => f.remove(), 700);
    try { // kamera-klik
      const a = Spil.audio(), t = a.currentTime, b = a.createBuffer(1, a.sampleRate * .08, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = a.createBufferSource(), g = a.createGain(); g.gain.value = .4; s.buffer = b; s.connect(g).connect(a.destination); s.start(t);
    } catch (e) {}
    gallery.unshift({ m: { ...m }, n });
    if (gallery.length > 12) gallery.length = 12;
    if (!dybTest) save();
    // et lille foto flyver op til galleri-knappen
    const btn = q(".mo-galbtn"); btn.hidden = false;
    const a = q(".mo-mon").getBoundingClientRect(), b = btn.getBoundingClientRect();
    const p = document.createElement("div"); p.className = "mo-photo";
    p.style.left = a.left + "px"; p.style.top = a.top + "px"; p.style.width = a.width * .6 + "px";
    p.innerHTML = svg(m, "mini", FOTO);
    document.body.appendChild(p);
    let landed = false;
    const land = () => { // idempotent: kaldes af animationen eller af reserve-timeren
      if (landed || !alive) return; landed = true; p.remove();
      anim(btn, "got"); Spil.sfx.right();
      q(".mo-new").hidden = false; seq = false;
    };
    p.animate([{ transform: `translate(${a.width * .2}px,${a.height * .1}px) rotate(0)` },
      { transform: `translate(${b.left - a.left - a.width * .2}px,${b.top - a.top - a.height * .25}px) scale(.15) rotate(20deg)`, opacity: .6 }],
      { duration: 900, delay: 300, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).onfinish = land;
    later(land, 2500);
  }

  function fresh(first) {
    phase = "build"; cat = null; lastName = null; seq = false; m = NY();
    q(".mo-name").textContent = ""; q(".mo-new").hidden = true; q(".mo-done").hidden = false; q(".mo-bar").hidden = false;
    q(".mo-opts").innerHTML = "";
    drawBar(); render();
    if (first) Spil.say("Lad os bygge et monster! Tryk på knapperne og byg dit monster!", null, ["monster-start", "monster-vaelg"]);
    else Spil.say("Lad os bygge et nyt monster!", null, "monster-nyt");
  }

  // Dybt link til test (Spil.dyb): led adskilt af komma. Et valg-navn (fx "paere", "lilla", "3", "vinger", "stjerner")
  // sættes på monsteret, "kat-arme" åbner en kategori, "levende" trykker færdig (gemmes ikke i galleriet),
  // og "galleri" åbner galleriet (med eksempel-monstre, hvis det er tomt). Fx "paere,lilla,horn,kat-arme".
  function dybtLink(d) {
    let k = null, efter = null;
    d.split(/[\s,+\/]+/).forEach(t => {
      if (t.startsWith("kat-") && CATS.some(c => c.k === t.slice(4))) k = t.slice(4);
      else if (t === "levende" || t === "galleri") efter = t;
      else { const c = CATS.find(c => c.valg.includes(t)); if (c) m[c.k] = t; }
    });
    render();
    if (k) openCat(k);
    if (efter === "levende") { dybTest = true; finish(); }
    if (efter === "galleri") {
      if (!gallery.length) gallery = NAVNE.slice(0, 6).map((_, i) => ({ n: i, m: {
        krop: CATS[0].valg[i % 4], farve: FARVER[i % 7][0], oejne: CATS[2].valg[(i + 1) % 4], mund: CATS[3].valg[i % 4],
        top: CATS[4].valg[i % 4], arme: CATS[5].valg[(i + 2) % 4], moenster: CATS[6].valg[i % 4] } }));
      dybTest = true; q(".mo-galbtn").hidden = false; openGallery();
    }
  }

  function openGallery() {
    Spil.sfx.click();
    const g = document.createElement("div"); g.className = "mo-gal";
    g.innerHTML = `<h2>Mine monstre</h2><button class="mo-close" aria-label="Luk">✖</button>
      <div class="mo-grid">${gallery.map((x, i) => `<button class="mo-card" data-i="${i}" style="transform:rotate(${(i % 3 - 1) * 2.5}deg)">${svg(x.m, "", FOTO)}<span>${NAVNE[x.n]}</span></button>`).join("")}</div>`;
    root.appendChild(g);
    g.querySelector(".mo-close").onclick = () => { Spil.sfx.click(); g.remove(); };
    g.querySelectorAll(".mo-card").forEach(c => c.onclick = () => {
      const x = gallery[+c.dataset.i];
      anim(c.querySelector(".mo-svg"), "wiggle");
      Spil.tone([600, 900], .06);
      Spil.say(`Jeg hedder ${NAVNE[x.n]}!`, null, `monster-navn-${x.n}`);
    });
    Spil.say("Her er alle dine monstre!", null, "monster-galleri");
  }

  Spil.register({
    id: "byg-monster", navn: "Byg et monster", ikon: "👾", farve: "#ffb3d9",
    start(r) {
      Spil.preload(["monster-start", "monster-vaelg", "monster-nyt", "monster-lever", "monster-foto", "monster-galleri", "pleje-kilder",
        ...NAVNE.map((_, i) => `monster-navn-${i}`), ...CATS.flatMap(c => c.valg.map(v => keyOf(c.k, v)))]);
      alive = true; timers = []; gallery = load().filter(x => x && x.m && KROPPE[x.m.krop] && NAVNE[x.n]);
      r.innerHTML = `<div class="mo">
        <button class="mo-galbtn" aria-label="Mine monstre"${gallery.length ? "" : " hidden"}>🖼️</button>
        <div class="mo-name"></div>
        <div class="mo-stage"><button class="mo-mon" aria-label="Monster"></button>
          <button class="mo-done" aria-label="Færdig">🎉</button>
          <button class="mo-new" hidden aria-label="Nyt monster">➕</button></div>
        <div class="mo-opts"></div>
        <div class="mo-bar"></div></div>`;
      root = r.querySelector(".mo");
      q(".mo-mon").onclick = tickle;
      q(".mo-done").onclick = () => { Spil.sfx.click(); finish(); };
      q(".mo-new").onclick = () => { Spil.sfx.click(); fresh(false); };
      q(".mo-galbtn").onclick = openGallery;
      dybTest = false;
      fresh(true);
      if (Spil.dyb) { Spil.stopTalking(); dybtLink(Spil.dyb); }
    },
    stop() { alive = false; timers.forEach(clearTimeout); document.querySelectorAll(".mo-photo").forEach(p => p.remove()); }
  });
})();
