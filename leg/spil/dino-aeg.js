// Spil: Dino-æg — tryk på ægget, til det klækker. Hver dino brøler sit navn og flytter ned i samlingen.
// Tryk på en dino i samlingen for at besøge dino-dalen, hvor alle dinoerne går rundt. Hver dino har sin egen
// lyd og sit eget trick. Find alle 8, og så kan der komme bronze-æg, derefter sølv-æg og til sidst guld-æg. Samlingen huskes på enheden.
(function () {
  /* ---------- Tegninger (viewBox 0 0 240 200, kigger mod højre, står på y≈192) ---------- */
  const eye = (x, y, r = 9) => `<g class="dn-eye" style="transform-origin:${x}px ${y}px">
    <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke-width="3"/><circle cx="${x + r * .2}" cy="${y}" r="${r * .6}" fill="#1f3a5f" stroke="none"/>
    <circle cx="${x + r * .42}" cy="${y - r * .3}" r="${r * .26}" fill="#fff" stroke="none"/><circle cx="${x - r * .05}" cy="${y + r * .3}" r="${r * .12}" fill="#fff" stroke="none" opacity=".7"/></g>`;
  const jaw = (ox, oy, d) => `<g class="dn-jaw" style="transform-origin:${ox}px ${oy}px"><path d="${d}"/></g>`;
  // Ben med små tæer
  const legs = (xs, y, w, h, fill) => xs.map(x => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.2}" fill="${fill}"/>
    <path d="M${x + w * .34} ${y + h - 1} v-6 M${x + w * .66} ${y + h - 1} v-6" fill="none" stroke-width="2.5"/>`).join("");
  // Lille fast tilfældighed (græstotter og blomster står samme sted hver gang)
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  // Farveblanding: mod hvid (lysere) eller sort (mørkere)
  const bland = (hex, mod, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + mod * t).toString(16).padStart(2, "0")).join("");
  const lysere = (h, t = .35) => bland(h, 255, t), morkere = (h, t = .2) => bland(h, 0, t);
  const spots = (pts, fill) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="none" opacity=".55"/>`).join("");

  const DINOS = [
    { k: "trex", navn: "T-rex", c: "#6cc46b", d: "#2f7a3a", b: "#dff5b5", lyd: [85, 1.2, "saw"],
      art: (c, d, b) => `
        <path d="M78 112 C50 108 22 96 4 70 C18 104 48 132 84 140 Z"/>
        ${legs([96], 135, 26, 57, d)}
        <ellipse cx="112" cy="118" rx="50" ry="38"/>
        <ellipse cx="126" cy="132" rx="28" ry="20" fill="${b}" stroke="none"/>
        ${legs([120], 140, 26, 52, c)}
        <ellipse cx="150" cy="94" rx="22" ry="30"/>
        <path d="M150 116 q16 2 18 16 l-7 2 q-3 -9 -13 -9 Z"/>
        ${jaw(150, 88, "M150 88 C176 86 206 84 226 86 C224 102 196 110 160 108 Z")}
        <path d="M138 90 C132 50 156 30 188 30 C214 30 234 46 234 66 C234 78 228 84 220 84 C200 84 176 86 150 94 Z"/>
        <path d="M172 86 l4 9 l4 -10 M186 85 l4 9 l4 -10 M200 84 l4 9 l4 -10" fill="#fff" stroke-width="2.5"/>
        <circle cx="222" cy="52" r="2.5" fill="${d}"/>
        ${spots([[100, 92, 7], [122, 88, 5], [84, 106, 5]], d)}
        ${eye(192, 52)}` },
    { k: "triceratops", navn: "Triceratops", c: "#ff9f43", d: "#a8520c", b: "#ffe2b8", lyd: [120, .9, "saw"],
      art: (c, d, b) => `
        <path d="M60 120 C40 118 18 110 4 96 C20 124 44 140 68 142 Z"/>
        ${legs([70, 146], 140, 26, 52, d)}
        <ellipse cx="108" cy="126" rx="62" ry="40"/>
        <ellipse cx="112" cy="146" rx="40" ry="14" fill="${b}" stroke="none"/>
        ${legs([92, 162], 146, 25, 46, c)}
        <path d="M150 64 C146 22 196 6 214 36 C230 64 214 108 182 120 Z" fill="#ffd166"/>
        ${spots([[180, 34, 5], [198, 48, 5], [168, 52, 4], [204, 74, 4]], d)}
        ${jaw(198, 112, "M198 112 C214 118 228 114 232 108 C230 122 214 128 200 124 Z")}
        <path d="M158 100 C158 72 198 62 222 78 C236 88 240 102 232 112 C218 124 180 126 164 118 Z"/>
        <path d="M186 76 L176 38 L198 72 Z M208 78 L222 42 L218 84 Z" fill="#fff6e0"/>
        <path d="M226 90 L240 76 L234 100 Z" fill="#fff6e0"/>
        ${eye(198, 90, 8)}` },
    { k: "stegosaurus", navn: "Stegosaurus", c: "#b57dff", d: "#6a35b8", b: "#eadcff", lyd: [140, .9, "saw"],
      art: (c, d, b) => `
        ${[[64, 98], [86, 78], [112, 70], [138, 76], [160, 94]].map(([x, y]) => `<path d="M${x - 13} ${y + 16} L${x} ${y - 24} L${x + 13} ${y + 16} Z" fill="#ff8fb1"/>`).join("")}
        <path d="M4 102 L5 76 L21 113 Z M21 111 L26 83 L38 119 Z" fill="#fff6e0"/>
        <path d="M64 124 C40 120 18 112 4 98 C18 128 42 142 72 144 Z"/>
        ${legs([72, 146], 140, 26, 52, d)}
        <ellipse cx="112" cy="126" rx="62" ry="40"/>
        <ellipse cx="116" cy="146" rx="40" ry="14" fill="${b}" stroke="none"/>
        ${legs([94, 164], 146, 25, 46, c)}
        ${jaw(206, 138, "M206 138 C218 142 228 140 234 136 C232 146 218 150 206 146 Z")}
        <path d="M166 120 C186 110 200 116 212 114 C228 112 238 122 236 132 C232 142 208 142 192 140 C180 138 172 136 164 134 Z"/>
        ${spots([[96, 104, 6], [124, 100, 6], [146, 112, 5]], d)}
        ${eye(216, 122, 7)}` },
    { k: "brachiosaurus", navn: "Brachiosaurus", c: "#4d96ff", d: "#1f5bb8", b: "#cfe4ff", lyd: [62, 1.6, "sine"],
      art: (c, d, b) => `
        <path d="M60 132 C40 130 18 124 4 112 C18 140 44 152 66 152 Z"/>
        ${legs([66, 126], 146, 26, 46, d)}
        <path d="M134 124 C150 84 160 44 170 22 L196 30 C184 54 174 96 168 136 Z"/>
        <ellipse cx="104" cy="134" rx="58" ry="36"/>
        <ellipse cx="108" cy="152" rx="36" ry="12" fill="${b}" stroke="none"/>
        ${legs([86, 146], 146, 25, 46, c)}
        ${jaw(196, 32, "M196 32 C206 36 216 36 222 32 C220 40 208 44 198 40 Z")}
        <ellipse cx="196" cy="24" rx="26" ry="15"/>
        <ellipse cx="188" cy="12" rx="12" ry="8"/>
        ${spots([[160, 70, 5], [168, 96, 5], [92, 116, 6], [118, 112, 5]], d)}
        ${eye(202, 20, 6)}` },
    { k: "ankylosaurus", navn: "Ankylosaurus", c: "#d9a85b", d: "#7d5520", b: "#f6e3bd", lyd: [105, 1, "saw"],
      art: (c, d, b) => `
        <path d="M62 128 L22 118 L20 132 L62 144 Z"/>
        <ellipse cx="16" cy="125" rx="15" ry="13" fill="${d}"/>
        ${legs([62, 150], 146, 26, 46, d)}
        <path d="M44 152 C44 92 186 92 190 152 Z"/>
        ${[[70, 122], [96, 108], [124, 104], [152, 110], [174, 126], [84, 138], [114, 130], [142, 134]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${b}"/>`).join("")}
        <path d="M50 140 l-12 6 l12 4 M182 140 l12 6 l-12 4" fill="#fff6e0"/>
        ${legs([84, 172], 146, 25, 46, c)}
        ${jaw(204, 150, "M204 150 C216 154 226 152 230 148 C228 158 216 162 206 158 Z")}
        <path d="M176 132 C180 118 204 116 222 126 C234 134 234 148 226 152 C214 158 190 156 180 148 Z"/>
        <path d="M184 124 l-6 -12 l14 6 Z" fill="#fff6e0"/>
        ${eye(208, 134, 7)}` },
    { k: "pteranodon", navn: "Pteranodon", c: "#ff6b6b", d: "#b73a3a", b: "#ffd3cc", lyd: [700, .6, "square"], flyver: true,
      art: (c, d, b) => `
        <g class="dn-wing dn-wl" style="transform-origin:116px 104px"><path d="M116 104 C88 62 40 52 4 76 C38 84 76 104 108 124 Z"/></g>
        <g class="dn-wing dn-wr" style="transform-origin:124px 104px"><path d="M124 104 C152 62 200 52 236 76 C202 84 164 104 132 124 Z"/></g>
        <ellipse cx="120" cy="116" rx="18" ry="28"/>
        <ellipse cx="122" cy="122" rx="10" ry="16" fill="${b}" stroke="none"/>
        <path d="M110 144 l-6 14 M130 144 l6 14" fill="none"/>
        <path d="M118 74 L80 54 L120 68 Z" fill="${d}"/>
        ${jaw(140, 86, "M140 86 L196 84 L140 92 Z")}
        <path d="M108 82 C108 66 128 60 140 70 L200 80 L140 86 C128 94 110 94 108 82 Z"/>
        ${eye(128, 76, 7)}` },
    { k: "parasaurolophus", navn: "Parasaurolophus", c: "#2ec4b6", d: "#137a71", b: "#c9f5ef", lyd: [220, 1.1, "horn"],
      art: (c, d, b) => `
        <path d="M78 112 C50 108 22 96 4 70 C18 104 48 132 84 140 Z"/>
        ${legs([96], 135, 26, 57, d)}
        <ellipse cx="110" cy="120" rx="50" ry="38"/>
        <ellipse cx="124" cy="134" rx="28" ry="20" fill="${b}" stroke="none"/>
        ${legs([118], 140, 26, 52, c)}
        <ellipse cx="148" cy="94" rx="20" ry="30"/>
        <path d="M148 118 q14 2 16 14 l-7 2 q-3 -8 -11 -8 Z"/>
        <path d="M152 64 C130 46 100 32 76 30 C72 38 80 44 88 46 C110 52 132 64 150 80 Z" fill="#ffb84d"/>
        ${jaw(186, 92, "M186 92 C204 94 222 90 230 86 C228 98 206 104 186 102 Z")}
        <path d="M140 82 C140 62 164 54 184 58 C204 62 226 72 230 84 C222 94 192 98 162 100 C148 100 140 94 140 82 Z"/>
        ${spots([[98, 96, 6], [120, 92, 5], [84, 110, 5]], d)}
        ${eye(176, 72, 8)}` },
    { k: "spinosaurus", navn: "Spinosaurus", c: "#ffc93c", d: "#a3740a", b: "#fff2c4", lyd: [95, 1.2, "saw"],
      art: (c, d, b) => `
        <path d="M58 112 C64 40 142 26 160 92 Z" fill="#ff7a59"/>
        <path d="M80 100 L84 60 M104 96 L108 46 M128 94 L132 50 M148 92 L150 70" fill="none" stroke-width="3"/>
        <path d="M78 112 C50 108 22 96 4 70 C18 104 48 132 84 140 Z"/>
        ${legs([96], 135, 26, 57, d)}
        <ellipse cx="112" cy="118" rx="50" ry="38"/>
        <ellipse cx="126" cy="132" rx="28" ry="20" fill="${b}" stroke="none"/>
        ${legs([120], 140, 26, 52, c)}
        <ellipse cx="150" cy="96" rx="20" ry="28"/>
        <path d="M150 118 q14 2 16 14 l-7 2 q-3 -8 -11 -8 Z"/>
        ${jaw(160, 96, "M160 96 L230 88 C228 100 200 104 164 106 Z")}
        <path d="M140 94 C138 70 160 62 180 66 L230 76 C238 80 236 88 228 88 L160 98 Z"/>
        <path d="M186 90 l3 7 l3 -8 M200 88 l3 7 l3 -8 M214 87 l3 7 l3 -8" fill="#fff" stroke-width="2.5"/>
        ${eye(172, 76, 8)}` },
  ];
  // Hver form får en blød farveovergang (lys oppe til venstre, mørkere forneden). Metal-dinoer får et blankt skær.
  const svg = (dn, cls = "", metal = 0) => {
    const id = `dng-${dn.k}-${metal}`;
    const stop = metal
      ? `<stop offset="0" stop-color="${lysere(dn.c, .75)}"/><stop offset=".3" stop-color="${dn.c}"/><stop offset=".64" stop-color="${morkere(dn.c, .22)}"/><stop offset="1" stop-color="${lysere(dn.c, .3)}"/>`
      : `<stop offset="0" stop-color="${lysere(dn.c, .42)}"/><stop offset=".45" stop-color="${dn.c}"/><stop offset="1" stop-color="${morkere(dn.c, .2)}"/>`;
    return `<svg class="dn-svg ${cls}" viewBox="0 0 240 200" aria-hidden="true">
    <defs><linearGradient id="${id}" x1=".2" y1="0" x2=".65" y2="1">${stop}</linearGradient></defs>
    <g fill="url(#${id})" stroke="${dn.d}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${dn.art(`url(#${id})`, dn.d, dn.b)}</g></svg>`;
  };
  // Metal-udgaverne: samme tegning i bronze, sølv eller guld, med glimt. Man får dem i den rækkefølge.
  const METAL = [null,
    { navn: "Bronze", n: "bronze", c: "#e39a5c", d: "#7d4317", b: "#fbe0c4", aeg: ["#f8d8b8", "#d98a4e"] },
    { navn: "Sølv", n: "soelv", c: "#d3dbe6", d: "#5f6b7d", b: "#f6f9fc", aeg: ["#f0f4f9", "#a9b4c4"] },
    { navn: "Guld", n: "guld", c: "#ffd54a", d: "#b07d0a", b: "#fff6c9", aeg: ["#fff3b0", "#ffc93c"] },
  ];
  const glimt = farve => [[30, 40, 9], [205, 20, 11], [120, 8, 7], [228, 150, 8]]
    .map(([x, y, r], i) => `<path class="dn-glimt" style="animation-delay:${i * -.4}s;transform-origin:${x}px ${y}px" d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="#fff" stroke="${farve}" stroke-width="1.5"/>`).join("");
  // t = 0 (almindelig), 1 (bronze), 2 (sølv) eller 3 (guld)
  const look = (dn, t, cls = "") => { const m = METAL[t]; return m ? svg({ ...dn, c: m.c, d: m.d, b: m.b }, `${cls} dn-metal dn-${m.n}`, t).replace("</svg>", glimt(m.aeg[1]) + "</svg>") : svg(dn, cls); };

  // Hvad hver dino kan i dino-dalen (replikken hedder dino-kan-<k>)
  const TRICK = {
    trex: "Hør T-rex stampe, så jorden ryster!",
    triceratops: "Triceratops løber afsted med sine horn!",
    stegosaurus: "Stegosaurus får sine plader til at lyse!",
    brachiosaurus: "Brachiosaurus strækker sin lange hals!",
    ankylosaurus: "Ankylosaurus svinger sin kølle! Bonk!",
    pteranodon: "Pteranodon flyver en tur i himlen!",
    parasaurolophus: "Parasaurolophus spiller musik med sit horn!",
    spinosaurus: "Spinosaurus hopper i vandet! Plask!",
  };

  const EGG = "M100 10 C158 10 190 116 190 168 C190 224 150 254 100 254 C50 254 10 224 10 168 C10 116 42 10 100 10 Z";
  const CRACKS = [
    "M100 60 l-12 18 l14 10 l-10 16",
    "M150 120 l-16 6 l6 16 l-18 8",
    "M50 130 l18 4 l-4 16 l16 6",
    "M120 190 l-10 -14 l16 -8 l-8 -14",
    "M72 80 l14 12 l-6 14 l14 8",
  ];
  const TAPS = 5;
  // Reden: en bagkant under ægget og en forkant af kviste foran, så ægget ligger i reden
  const KVIST = (y, c) => `<path d="M14 ${y} Q150 ${y + 34} 286 ${y}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  const REDE_BAG = `<svg class="dn-nest" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
    <ellipse cx="150" cy="78" rx="150" ry="20" fill="rgba(31,58,95,.2)"/>
    <ellipse cx="150" cy="44" rx="142" ry="34" fill="#9a6230" stroke="#6a3f18" stroke-width="4"/><ellipse cx="150" cy="46" rx="118" ry="22" fill="#4a2a10"/></svg>`;
  const REDE_FOR = `<svg class="dn-nest front" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dn-rede-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf9550"/><stop offset="1" stop-color="#9a6230"/></linearGradient></defs>
    <path d="M8 44 Q150 76 292 44 Q296 74 262 86 Q150 112 38 86 Q4 74 8 44 Z" fill="url(#dn-rede-g)" stroke="#6a3f18" stroke-width="4" stroke-linejoin="round"/>
    ${KVIST(52, "#e6b574")}${KVIST(60, "#8a5526")}${KVIST(68, "#deaa66")}${KVIST(77, "#8a5526")}
    <path d="M30 54 l40 14 M92 66 l44 6 M170 72 l46 -6 M236 64 l36 -14 M58 76 l30 4 M196 84 l34 -8 M120 90 l40 2 M20 62 l22 16 M258 80 l22 -18" stroke="#6a3f18" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 60 l26 9 M180 78 l30 -4 M110 74 l24 3" stroke="#f3cf95" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M22 50 q-14 -12 -6 -26 q12 8 10 24 Z M278 50 q14 -12 6 -26 q-12 8 -10 24 Z" fill="#6cc35c" stroke="#2f6e2c" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const RM = matchMedia("(prefers-reduced-motion: reduce)");

  Spil.css("css-dino-aeg", `
    .dn{position:relative;height:100%;overflow:hidden;overflow:clip;display:flex;flex-direction:column;
      background:linear-gradient(#ffb98a 0%,#ffd7a8 30%,#ffeccb 52%,#fff6e3 64%)}
    .dn-bg{position:absolute;inset:0;pointer-events:none}
    /* Samme tegnede vulkan og palmer som i dino-dalen */
    .dn-volcano{position:absolute;right:1vw;bottom:31%;width:min(32vw,48vh)}
    .dn-volcano .dd-volcano,.dn-palm .dd-tree{position:static;display:block}
    .dn-volcano .dd-volcano{width:100%}
    .dn-palm{position:absolute;bottom:35%;height:min(40vh,40vw)}
    .dn-palm .dd-tree{height:100%;width:auto}
    .dn-hill{position:absolute;left:0;right:0;bottom:0;width:100%;height:44%;display:block}
    .dn-bg .dd-mtn{bottom:36%;height:26%;opacity:.8}
    .dn-bg .dd-sun{top:9%;left:38%;width:clamp(90px,19vh,170px)}
    .dn-bg .dd-fern{width:clamp(110px,17vw,210px)}
    .dn-blomst,.dd-blomst{position:absolute;width:clamp(26px,4.4vh,40px);display:block;overflow:visible;pointer-events:none}
    .dn-main{position:relative;flex:1;min-height:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2vh}
    .dn-name{position:absolute;top:calc(3vh + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);font-weight:800;
      font-size:clamp(34px,7vh,72px);color:#fff;text-shadow:0 4px 0 rgba(31,58,95,.35);z-index:4;pointer-events:none;
      width:max-content;max-width:calc(100vw - 2 * max(16px,env(safe-area-inset-left,0px)));text-align:center;line-height:1.05}
    .dn-name.pulse{animation:dn-name .5s cubic-bezier(.3,1.6,.5,1)}
    @keyframes dn-name{from{transform:translateX(-50%) scale(.3);opacity:0}}
    /* Telefon på højkant: navnet står under 🏠-knappen og følger skærmbredden */
    @media (orientation:portrait){.dn-name{top:calc(12vh + env(safe-area-inset-top,0px));font-size:min(7vh,9.5vw)}}
    .dn-spot{position:relative;width:min(46vh,70vw);height:min(46vh,70vw);display:flex;align-items:flex-end;justify-content:center}
    .dn-nest{position:absolute;bottom:-2vh;left:4%;right:4%;height:24%;display:block;overflow:visible;pointer-events:none}
    .dn-nest.front{z-index:2}
    .dn-egg{position:relative;width:62%;background:none;padding:0;transform-origin:50% 95%;z-index:2}
    .dn-egg svg{display:block;width:100%;height:auto;overflow:visible}
    .dn-egg.metal svg{filter:drop-shadow(0 0 18px var(--gl))}
    .dn-egg.wob{animation:dn-wob .45s}
    .dn-egg.shake{animation:dn-shake .12s linear infinite}
    .dn-egg.roll{animation:dn-roll .9s cubic-bezier(.2,.9,.3,1.1)}
    @keyframes dn-wob{25%{transform:rotate(-9deg)}50%{transform:rotate(7deg)}75%{transform:rotate(-4deg)}}
    @keyframes dn-shake{25%{transform:rotate(-6deg) translateX(-4px)}75%{transform:rotate(6deg) translateX(4px)}}
    @keyframes dn-roll{from{transform:translateX(70vw) rotate(360deg)}}
    .dn-crack{fill:none;stroke:#5a3a1a;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:120;stroke-dashoffset:120;animation:dn-draw .25s forwards}
    @keyframes dn-draw{to{stroke-dashoffset:0}}
    .dn-shell{position:absolute;width:30%;z-index:3;pointer-events:none;animation:dn-shell 1s ease-out forwards}
    @keyframes dn-shell{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:0}}
    .dn-hero{position:absolute;bottom:0;left:50%;width:120%;transform:translateX(-50%);z-index:3;background:none;padding:0}
    .dn-hero::after{content:"";position:absolute;left:16%;right:12%;bottom:-2%;height:8%;border-radius:50%;background:rgba(31,58,95,.2);z-index:-1}
    .dn-hero .dn-svg{animation:dn-pop .6s cubic-bezier(.3,1.7,.5,1) both}
    @keyframes dn-pop{from{transform:scale(0) translateY(30%)}}
    .dn-svg{display:block;width:100%;height:auto;overflow:visible}
    .dn-bronze{--gl:rgba(226,140,70,.95)}.dn-soelv{--gl:rgba(215,228,245,.95)}.dn-guld{--gl:rgba(255,214,74,.95)}
    .dn-metal{animation:dn-glans 1.6s ease-in-out infinite alternate}
    @keyframes dn-glans{from{filter:drop-shadow(0 0 3px var(--gl)) brightness(1)}to{filter:drop-shadow(0 0 13px var(--gl)) brightness(1.1)}}
    .dn-glimt{transform-box:view-box;animation:dn-glimt 1.6s ease-in-out infinite}
    @keyframes dn-glimt{0%,100%{transform:scale(.2);opacity:0}50%{transform:scale(1.2);opacity:1}}
    .dn-eye{transform-box:view-box;animation:dn-blink 4s infinite}
    @keyframes dn-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
    .dn-jaw{transform-box:view-box;transition:transform .15s}
    .roar .dn-jaw{transform:rotate(16deg)}
    .roar{animation:dn-roar .5s ease-in-out 2}
    @keyframes dn-roar{50%{transform:scale(1.06) rotate(-2deg)}}
    .dn-wing{transform-box:view-box;animation:dn-flap .5s ease-in-out infinite alternate}
    .dn-wl{animation-name:dn-flapl}.dn-wr{animation-name:dn-flapr}
    @keyframes dn-flapl{to{transform:rotate(14deg)}}
    @keyframes dn-flapr{to{transform:rotate(-14deg)}}
    .dn-fly{animation:dn-hover 1.2s ease-in-out infinite alternate}
    @keyframes dn-hover{to{transform:translateY(-8%)}}

    /* Samlingen nederst: fundne dinoer i farver, de andre som skygger */
    .dn-valley{position:relative;z-index:5;display:grid;grid-template-columns:repeat(8,1fr);gap:clamp(4px,1vw,12px);
      margin:0 max(12px,env(safe-area-inset-left,0px)) calc(1.5vh + env(safe-area-inset-bottom,0px));padding:clamp(6px,1vh,12px);
      background:rgba(255,253,247,.85);border-radius:24px;box-shadow:0 6px 0 rgba(31,58,95,.18)}
    .dn-slot{position:relative;aspect-ratio:6/5;max-height:12vh;display:grid;place-items:center;background:none;padding:0;border-radius:14px;min-width:0}
    .dn-slot.sil{background:rgba(31,58,95,.06);pointer-events:none}
    .dn-slot.sil .dn-svg *{fill:rgba(31,58,95,.18);stroke:none}
    .dn-slot.sil .dn-svg{animation:none;transform:scale(.86)}
    .dn-slot .dn-svg{max-height:12vh}
    .dn-slot.hop{animation:dn-hop .6s}
    .dn-slot.new{animation:dn-new .7s cubic-bezier(.3,1.7,.5,1)}
    @keyframes dn-hop{40%{transform:translateY(-35%) rotate(-6deg)}}
    @keyframes dn-new{from{transform:scale(0)}}

    /* Dino-dalen: alle fundne dinoer går rundt, og hver har sit eget trick */
    .dd{position:absolute;inset:0;z-index:10;overflow:hidden;overflow:clip;touch-action:manipulation;
      background:linear-gradient(#62bdf2 0%,#aee0fa 30%,#e2f4ff 48%,#fff0d2 58%)}
    .dd.shake{animation:dd-shake .12s linear 5}
    @keyframes dd-shake{25%{transform:translate(-6px,3px)}75%{transform:translate(6px,-3px)}}
    .dd-sun{position:absolute;top:6%;left:9%;width:clamp(80px,16vh,150px);aspect-ratio:1}
    .dd-sun svg{display:block;width:100%;height:100%;overflow:visible}
    .dd-rays{transform-box:fill-box;transform-origin:center;animation:dd-spin 40s linear infinite}
    @keyframes dd-spin{to{transform:rotate(360deg)}}
    .dd-cloud{position:absolute;opacity:.96;animation:dd-drift linear infinite}
    .dd-cloud svg{display:block;width:100%;height:auto}
    @keyframes dd-drift{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
    /* Landskabet er tegnet i SVG: bjerge og bakker må gerne strækkes, vulkan og sø holder formen */
    .dd-mtn{position:absolute;left:0;right:0;bottom:41%;width:100%;height:30%;display:block}
    .dd-volcano{position:absolute;bottom:42%;right:15%;width:min(40%,62vh);display:block;overflow:visible}
    .dd-puff{transform-box:fill-box;transform-origin:center;animation:dd-puff 5s ease-out infinite;opacity:0}
    @keyframes dd-puff{0%{transform:translate(0,0) scale(.5);opacity:.85}100%{transform:translate(-30px,-90px) scale(2.4);opacity:0}}
    .dd-glow{animation:dd-glow 1.8s ease-in-out infinite alternate}
    @keyframes dd-glow{to{opacity:.55}}
    .dd-ground{position:absolute;left:0;right:0;bottom:0;width:100%;height:47%;display:block}
    .dd-pond{position:absolute;left:4%;bottom:31%;width:32%;display:block;overflow:visible}
    .dd-tree{position:absolute;right:1%;bottom:35%;height:min(50%,56vw);display:block;overflow:visible;pointer-events:none}
    .dd-tree.lille{right:auto;left:30%;bottom:42%;height:min(30%,34vw)}
    .dd-fern{position:absolute;width:clamp(150px,24vw,280px);display:block;overflow:visible;pointer-events:none}
    .dd-back{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));width:clamp(56px,9vh,84px);aspect-ratio:1;
      border-radius:50%;background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.25);font-size:clamp(26px,4.5vh,40px);z-index:900}
    .dd-back:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(31,58,95,.25)}
    .dd-dino{position:absolute;left:0;top:0;padding:0;background:none;will-change:transform}
    .dd-flip{transform-origin:50% 100%}
    .dd-body{transform-origin:50% 100%}
    .dd-dino::after{content:"";position:absolute;left:18%;right:12%;bottom:-3%;height:8%;border-radius:50%;background:rgba(31,58,95,.18);z-index:-1}
    .dd-dino.flyer::after{display:none}
    .dd-dino.walk .dd-body{animation:dd-step .45s ease-in-out infinite alternate}
    .dd-dino.run .dd-body{animation:dd-step .16s ease-in-out infinite alternate}
    @keyframes dd-step{from{transform:translateY(0) rotate(-1.5deg)}to{transform:translateY(-4%) rotate(1.5deg)}}
    @media (prefers-reduced-motion:reduce){.dn-egg.shake,.dn-egg.wob,.dn-egg.roll,.dn-eye,.dn-wing,.dn-fly,.roar,.dn-smoke,.dn-metal,.dn-glimt,.dd-cloud,.dd-dino .dd-body,.dd.shake{animation:none!important}
      .dd-rays,.dd-glow{animation:none!important}.dd-puff{animation:none!important;opacity:.6}}
    @media (orientation:portrait){.dn-palm.ekstra{display:none}.dn-palm{left:-12%!important;height:24vh;bottom:36%}
      .dn-volcano{right:-14%;width:50%;bottom:33%}.dn-bg .dd-sun{left:44%;top:22%}.dn-bg .dd-fern.to{display:none}
      .dn-valley{grid-template-columns:repeat(4,1fr)}
      .dd-tree.lille{display:none}.dd-tree{right:-14%;height:36%}
      .dd-sun{left:30%;top:5%}.dd-volcano{right:-4%;width:78%}.dd-pond{left:3%;width:58%;bottom:32%}}
  `);

  let root, alive, timers, taps, busy, found, trin, current, curTrin, demo, tvingTrin;
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const q = s => root.querySelector(s);
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // Ved dybe links (test) bruges en midlertidig samling, så barnets rigtige samling ikke røres
  // trin: { dino: 1 (bronze) | 2 (sølv) | 3 (guld) }. Den gamle liste "lk-dinoer-guld" holdes ved lige, så ældre gemte samlinger stadig passer.
  const save = () => { if (demo) return; write("lk-dinoer", found); write("lk-dinoer-trin", trin); write("lk-dinoer-guld", DINOS.filter(d => trin[d.k] === 3).map(d => d.k)); };
  const trinAf = k => trin[k] || 0;
  const byK = k => DINOS.find(d => d.k === k);

  /* ---------- Lyd: hver dino har sin egen stemme ---------- */
  // Små byggeklodser oven på Web Audio
  function tone(type, pts, t0, dur, peak = .3, lp = 0, vib = null) {
    const a = Spil.audio(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(pts[0][1], t);
    pts.slice(1).forEach(([f, hz]) => o.frequency.exponentialRampToValueAtTime(hz, t + f * dur));
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.06, dur * .25));
    g.gain.setValueAtTime(peak, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let n = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); n = f; }
    if (vib) { // vibrato/knurren: en langsom eller hurtig svingning af tonehøjden
      const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1];
      l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .05);
    }
    n.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t0, dur, freq, peak = .3, q = 1, to = 0) {
    const a = Spil.audio(), t = a.currentTime + t0, len = Math.ceil(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = "bandpass"; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur);
  }
  const HORN = [196, 247, 294, 392]; // Parasaurolophus' lille melodi (G-dur)
  const VOICE = {
    trex() { // dyb knurren
      tone("sawtooth", [[0, 110], [.3, 82], [1, 52]], 0, 1.4, .38, 700, [17, 7]);
      tone("sawtooth", [[0, 165], [1, 80]], 0, 1.2, .12, 900);
      noise(0, 1.2, 280, .14, .8);
    },
    triceratops() { // to fnys og et grynt
      noise(0, .18, 900, .4, 1.5); noise(.26, .22, 700, .4, 1.5);
      tone("sawtooth", [[0, 150], [1, 92]], .55, .45, .3, 600);
    },
    stegosaurus() { // fjollet "hu-hu" og et boing
      tone("triangle", [[0, 340], [1, 250]], 0, .26, .35); tone("triangle", [[0, 340], [1, 250]], .32, .26, .35);
      tone("sine", [[0, 200], [1, 560]], .72, .32, .3);
    },
    brachiosaurus() { // langt, dybt kald, som en hval
      tone("sine", [[0, 130], [.4, 185], [1, 98]], 0, 1.9, .45, 0, [5, 6]);
      tone("triangle", [[0, 260], [.4, 370], [1, 196]], 0, 1.9, .1, 0, [5, 10]);
    },
    ankylosaurus() { // grynt og et dumpt bonk
      tone("sawtooth", [[0, 120], [1, 70]], 0, .4, .3, 500);
      tone("sine", [[0, 170], [1, 40]], .45, .35, .6); noise(.45, .12, 220, .3);
    },
    pteranodon() { // to skrig
      tone("square", [[0, 900], [.3, 1500], [1, 1000]], 0, .34, .14, 3200, [24, 30]);
      tone("square", [[0, 1100], [.3, 1750], [1, 1200]], .42, .34, .14, 3200, [24, 30]);
    },
    parasaurolophus() { // trutter en melodi
      HORN.forEach((f, i) => tone("sawtooth", [[0, f], [1, f * 1.01]], i * .28, .3, .26, 900, [6, 3]));
    },
    spinosaurus() { // gurglende brøl
      tone("sawtooth", [[0, 135], [1, 78]], 0, 1.1, .34, 800, [28, 22]);
      noise(.1, .9, 500, .1, .7);
    },
  };
  const voice = k => { try { VOICE[k](); } catch (e) {} };

  /* ---------- Æggene ---------- */
  function drawValley() {
    q(".dn-valley").innerHTML = DINOS.map(dn => {
      if (!found.includes(dn.k)) return `<div class="dn-slot sil">${svg(dn)}</div>`;
      return `<button class="dn-slot" data-k="${dn.k}" aria-label="${dn.navn}">${look(dn, trinAf(dn.k))}</button>`;
    }).join("");
    root.querySelectorAll(".dn-slot[data-k]").forEach(b => b.onclick = () => {
      if (busy || dal) return;
      openDal(b.dataset.k);
    });
  }

  function newEgg(first) {
    taps = 0; busy = false;
    const left = DINOS.filter(d => !found.includes(d.k));
    curTrin = 0;
    if (left.length) current = left[Math.random() * left.length | 0];
    else {
      // Alle fundet: nu kan der komme metal-æg. Først bronze til alle, så sølv til alle, og til sidst guld.
      const lavest = Math.min(...DINOS.map(d => trinAf(d.k)));
      if (lavest < 3 && (tvingTrin || Math.random() < .5)) curTrin = lavest + 1;
      const pool = curTrin ? DINOS.filter(d => trinAf(d.k) === lavest) : DINOS;
      current = pool[Math.random() * pool.length | 0];
    }
    // Ægget har dinoens farver, så man kan gætte, hvem der er i
    const [shell, dots] = curTrin ? METAL[curTrin].aeg : [current.b, current.c];
    q(".dn-name").textContent = "";
    q(".dn-spot").innerHTML = `${REDE_BAG}
      <button class="dn-egg roll${curTrin ? " metal dn-" + METAL[curTrin].n : ""}" aria-label="Æg">
        <svg viewBox="0 0 200 264">
          <defs><radialGradient id="dn-aeg-g" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a3a1a" stop-opacity=".3"/></radialGradient>
            <clipPath id="dn-aeg-c"><path d="${EGG}"/></clipPath></defs>
          <path d="${EGG}" fill="${shell}"/>
          <g clip-path="url(#dn-aeg-c)" fill="${dots}" stroke="${morkere(dots, .22)}" stroke-width="3">${[[70, 70, 14], [130, 110, 18], [60, 170, 16], [140, 200, 12], [100, 140, 9], [118, 50, 8], [176, 160, 13], [24, 130, 11], [96, 240, 14]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>
          <path d="${EGG}" fill="url(#dn-aeg-g)"/>
          <path d="${EGG}" fill="none" stroke="#5a3a1a" stroke-width="4"/>
          <ellipse cx="62" cy="92" rx="11" ry="28" fill="#fff" opacity=".6" transform="rotate(20 62 92)"/><circle cx="84" cy="52" r="5" fill="#fff" opacity=".6"/>
          <g class="dn-cracks"></g></svg></button>${REDE_FOR}`;
    const egg = q(".dn-egg");
    egg.onclick = tap;
    egg.addEventListener("animationend", () => egg.classList.remove("roll", "wob"));
    if (first && demo) {}
    else if (first) later(() => Spil.say("Tryk på ægget!", null, "dino-tryk"), 700);
    else if (found.length === 1 && !hinted) { hinted = true; Spil.say("Se, et nyt æg! Tryk på din dino for at se, hvad den kan!", null, ["dino-nyt", "dino-kan"]); }
    else Spil.say("Se, et nyt æg!", null, "dino-nyt");
  }

  function tap() {
    if (busy) return;
    const egg = q(".dn-egg");
    taps++;
    egg.classList.remove("wob"); void egg.offsetWidth; egg.classList.add("wob");
    Spil.tone([700 + taps * 120, 400], .05, "square");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", CRACKS[taps - 1]); p.setAttribute("class", "dn-crack");
    q(".dn-cracks").appendChild(p);
    // De små replikker undervejs må ikke afbryde en anden replik (fx hintet om at trykke på dinoen)
    if (taps === 3 && !Spil.isTalking()) Spil.say("Der er noget derinde!", null, "dino-noget");
    if (taps >= TAPS) hatch();
  }

  function hatch() {
    busy = true;
    const egg = q(".dn-egg"), spot = q(".dn-spot"), shell = curTrin ? METAL[curTrin].aeg[0] : current.b;
    egg.classList.remove("wob"); egg.classList.add("shake");
    if (!Spil.isTalking()) Spil.say("Det klækker!", null, "dino-klaekker");
    later(() => {
      // skallen springer
      Spil.sfx.pop(); Spil.burstAt(egg, curTrin ? "✨🌟✨⭐✨🌟✨⭐" : "✨⭐✨🌟✨⭐");
      [[-1, -1], [1, -1], [-1, .3], [1, .3]].forEach(([sx, sy], i) => {
        const s = document.createElement("div"); s.className = "dn-shell";
        s.innerHTML = `<svg viewBox="0 0 60 50"><path d="M0 20 L10 0 L22 14 L34 0 L46 14 L60 4 L60 50 L0 50 Z" fill="${shell}" stroke="#5a3a1a" stroke-width="3"/></svg>`;
        s.style.left = (35 + sx * 10) + "%"; s.style.bottom = (30 + sy * 15) + "%";
        s.style.setProperty("--dx", sx * (25 + i * 4) + "vw"); s.style.setProperty("--dy", (sy < 0 ? -30 : 10) + "vh");
        s.style.setProperty("--r", sx * 200 + "deg");
        spot.appendChild(s); setTimeout(() => s.remove(), 1100);
      });
      egg.remove();
      const dn = current, g = curTrin, m = METAL[g];
      const hero = document.createElement("div"); hero.className = "dn-hero";
      hero.innerHTML = look(dn, g, dn.flyver ? "dn-fly" : "");
      spot.appendChild(hero);
      const name = q(".dn-name"); name.textContent = (m ? m.navn + "-" : "") + dn.navn;
      name.classList.remove("pulse"); void name.offsetWidth; name.classList.add("pulse");
      later(() => {
        const s = hero.querySelector(".dn-svg"); s.classList.add("roar"); voice(dn.k);
        later(() => s.classList.remove("roar"), 1000);
        // flyt i dalen når navnet er sagt — og i hvert fald lidt efter, hvis stemmen ikke melder færdig
        let went = false; const go = () => { if (went) return; went = true; toValley(hero, dn, g); };
        Spil.say((m ? `Wow! En ${m.navn.toLowerCase()}-dino! ` : "") + dn.navn, () => later(go, 700), m ? [`dino-${m.n}`, `dino-${dn.k}`] : `dino-${dn.k}`);
        later(go, g ? 8000 : 5500);
      }, 500);
    }, 1100);
  }

  function toValley(hero, dn, g) {
    const isNew = g ? trinAf(dn.k) < g : !found.includes(dn.k);
    if (isNew) { if (g) trin[dn.k] = g; else found.push(dn.k); save(); }
    // er hele holdet nu samlet (alle fundet, eller alle har mindst dette metal)?
    const alle = g ? DINOS.every(d => trinAf(d.k) >= g) : found.length >= DINOS.length;
    drawValley();
    q(".dn-name").textContent = "";
    const slot = q(`.dn-slot[data-k="${dn.k}"]`);
    const a = hero.getBoundingClientRect(), b = slot.getBoundingClientRect();
    slot.style.visibility = "hidden";
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), sc = b.width / a.width;
    const anim = hero.animate([{ transform: "translateX(-50%)" }, { transform: `translate(calc(-50% + ${dx}px),${dy}px) scale(${sc})` }],
      { duration: 800, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
    anim.onfinish = () => {
      if (!alive) return;
      hero.remove(); slot.style.visibility = ""; slot.classList.add("new");
      Spil.sfx.right();
      if (isNew && alle) return party(g);
      later(() => newEgg(false), 600);
    };
  }

  function party(g) {
    Spil.sfx.fanfare();
    const v = q(".dn-valley"); Spil.burstAt(v, g ? "🌟✨🦖🦕🌟✨🦖🦕" : "🦖🦕🎉⭐🦖🦕🎉⭐");
    root.querySelectorAll(".dn-slot").forEach((s, i) => later(() => { s.classList.remove("hop", "new"); void s.offsetWidth; s.classList.add("hop"); }, i * 120));
    let nxt = false; const again = () => { if (nxt) return; nxt = true; newEgg(false); };
    const [tekst, noegler] = [
      ["Du har fundet alle dinosaurerne! Hurra! Nu kan der komme bronze-æg!", ["dino-alle", "dino-bronze-aeg"]],
      ["Nu har du alle bronze-dinoerne! Flot! Nu kan der komme sølv-æg!", ["dino-alle-bronze", "dino-soelv-aeg"]],
      ["Nu har du alle sølv-dinoerne! Sejt! Nu kan der komme guld-æg!", ["dino-alle-soelv", "dino-guld-aeg"]],
      ["Nu har du alle guld-dinoerne! Wow!", ["dino-alle-guld"]],
    ][g];
    Spil.say(tekst, () => later(again, 1500), noegler);
    later(again, 9000);
  }

  /* ---------- Dino-dalen ---------- */
  // Landskabet bag dinoerne
  const DAL_SOL = `<svg viewBox="-60 -60 120 120">
    <defs><radialGradient id="dd-solg"><stop offset="0" stop-color="#fff6c2" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></radialGradient>
      <radialGradient id="dd-solf" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fff7b8"/><stop offset="1" stop-color="#ffc93c"/></radialGradient></defs>
    <circle r="92" fill="url(#dd-solg)"/>
    <g class="dd-rays" fill="#ffe27a">${Array.from({ length: 12 }, (_, i) =>
    `<path d="M-6 -40 L0 ${i % 2 ? -54 : -60} L6 -40 Z" transform="rotate(${i * 30})"/>`).join("")}</g>
    <circle r="40" fill="url(#dd-solf)" stroke="#e8a51e" stroke-width="2.5"/><ellipse cx="-13" cy="-15" rx="8" ry="12" fill="#fffbe0" opacity=".7" transform="rotate(40 -13 -15)"/></svg>`;
  // En sky: lyseblå underside og hvid top
  const SKY = `<svg viewBox="0 0 200 92" aria-hidden="true"><g fill="#cfe4f3"><circle cx="52" cy="60" r="26"/><circle cx="96" cy="46" r="34"/><circle cx="144" cy="58" r="27"/><rect x="40" y="54" width="120" height="32" rx="16"/></g>
    <g fill="#fff"><circle cx="52" cy="54" r="26"/><circle cx="96" cy="40" r="34"/><circle cx="144" cy="52" r="27"/><rect x="40" y="48" width="120" height="30" rx="15"/></g></svg>`;
  const sky = style => `<div class="dd-cloud" style="${style}">${SKY}</div>`;
  const DAL_BJERGE = `<svg class="dd-mtn" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dd-bj1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7a8ec"/><stop offset="1" stop-color="#ddd4f7"/></linearGradient>
      <linearGradient id="dd-bj2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9482d6"/><stop offset="1" stop-color="#b9abe6"/></linearGradient></defs>
    <path d="M0 300 V170 Q40 150 80 120 Q120 90 150 110 Q190 135 230 90 Q280 30 330 70 Q370 100 400 130 Q440 160 480 120
      Q520 80 560 100 Q600 120 640 150 Q700 190 760 130 Q820 70 870 100 Q920 130 960 120 Q985 115 1000 125 V300 Z" fill="url(#dd-bj1)"/>
    <path d="M230 90 Q280 30 330 70 Q300 64 286 82 Q266 70 250 90 Z M760 130 Q820 70 870 100 Q840 96 826 112 Q806 100 790 122 Z M80 120 Q120 90 150 110 Q130 108 118 120 Q104 112 94 124 Z M480 120 Q520 80 560 100 Q540 98 528 110 Q514 102 502 116 Z" fill="#f3eefe"/>
    <path d="M0 300 V230 Q60 200 120 175 Q170 155 210 180 Q260 215 320 190 Q380 160 430 185 Q490 215 540 200
      Q600 180 650 205 Q720 240 790 210 Q860 180 920 200 Q965 215 1000 205 V300 Z" fill="url(#dd-bj2)"/></svg>`;
  const DAL_VULKAN = `<svg class="dd-volcano" viewBox="0 0 300 200" aria-hidden="true">
    <defs><linearGradient id="dd-vu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a888bd"/><stop offset=".5" stop-color="#8f6ea5"/><stop offset="1" stop-color="#6c4b84"/></linearGradient></defs>
    <circle class="dd-puff" cx="150" cy="58" r="14" fill="#f1eef7"/>
    <circle class="dd-puff" cx="150" cy="58" r="14" fill="#f1eef7" style="animation-delay:-1.7s"/>
    <circle class="dd-puff" cx="150" cy="58" r="14" fill="#f1eef7" style="animation-delay:-3.4s"/>
    <path d="M0 200 C64 190 96 150 112 96 Q118 76 130 72 L170 72 Q182 76 188 96 C204 150 236 190 300 200 Z" fill="url(#dd-vu)" stroke="#553368" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M70 170 q10 -14 20 -30 M222 176 q-10 -16 -18 -34 M104 190 q6 -16 10 -34 M196 150 q-6 -18 -8 -30" fill="none" stroke="#553368" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="150" cy="73" rx="22" ry="6" fill="#553368"/>
    <ellipse cx="150" cy="73" rx="16" ry="3.5" fill="#ffb347"/>
    <g stroke="#c9481c" stroke-width="2.5" stroke-linejoin="round">
    <path d="M138 75 C134 92 124 104 124 122 C124 136 138 136 138 122 C138 106 144 92 146 76 Z" fill="#ff7a3c"/>
    <path d="M156 75 C160 88 172 100 172 116 C172 128 184 128 184 116 C184 100 170 88 163 75 Z" fill="#ff7a3c"/></g>
    <path class="dd-glow" d="M140 77 C137 92 130 104 130 120 C130 126 134 126 134 120 C134 106 141 92 144 78 Z M158 77 C162 88 170 100 170 112 C171 118 176 118 176 112 C176 100 167 88 161 77 Z" fill="#ffd166"/></svg>`;
  // Bakker tegnet ud fra en kurve y(x) (x fra 0 til 1000), med græstotter langs kanten
  const kurve = (f, n = 50) => Array.from({ length: n + 1 }, (_, i) => `${i ? "L" : "M"}${i * 1000 / n} ${f(i * 1000 / n).toFixed(1)}`).join(" ");
  const totter = (f, skridt, seed, farve, h = 1) => {
    let d = "";
    for (let x = 6 + hash(seed) * skridt, k = 0; x < 996; x += skridt * (.6 + hash(seed + k) * .9), k++) {
      const y = f(x) + 2;
      d += `M${x.toFixed(0)} ${y.toFixed(0)} q-2 ${-9 * h} -6 ${-15 * h} M${(x + 4).toFixed(0)} ${y.toFixed(0)} q0 ${-11 * h} 1 ${-19 * h} M${(x + 8).toFixed(0)} ${y.toFixed(0)} q2 ${-8 * h} 7 ${-13 * h} `;
    }
    return `<path d="${d}" fill="none" stroke="${farve}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  };
  const yBag = x => 26 + 16 * Math.sin(x / 150 + 1) + 8 * Math.sin(x / 61);
  const yFor = x => 92 + 20 * Math.sin(x / 210 + 2.2) + 6 * Math.sin(x / 83);
  const DAL_BAKKER = `<svg class="dd-ground" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dd-graes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93d86f"/><stop offset="1" stop-color="#55a443"/></linearGradient>
      <linearGradient id="dd-graes2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0eb9c"/><stop offset="1" stop-color="#a0d97c"/></linearGradient></defs>
    <path d="${kurve(yBag)} V500 H0 Z" fill="url(#dd-graes2)"/>${totter(yBag, 46, 3, "#8fcf6a", .7)}
    <path d="${kurve(yFor)} V500 H0 Z" fill="url(#dd-graes)"/>${totter(yFor, 30, 7, "#3f9136")}${totter(yFor, 44, 19, "#a6e37f", .8)}
    <path d="M0 300 Q260 250 520 280 Q780 310 1000 270 V500 H0 Z" fill="#4f9e3f" opacity=".3"/>
    <g fill="#3f9136" opacity=".35">${Array.from({ length: 16 }, (_, i) => `<ellipse cx="${(hash(i + 4) * 1000).toFixed(0)}" cy="${(170 + hash(i + 30) * 300).toFixed(0)}" rx="${(16 + hash(i) * 22).toFixed(0)}" ry="5"/>`).join("")}</g></svg>`;
  // Bakken bag reden på æg-skærmen
  const yHoej = x => 132 - 124 * (1 - ((x - 500) / 500) ** 2);
  const DN_BAKKE = `<svg class="dn-hill" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dn-graes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bdc76"/><stop offset=".6" stop-color="#62b34b"/><stop offset="1" stop-color="#4f9e3f"/></linearGradient></defs>
    <path d="${kurve(yHoej)} V440 H0 Z" fill="url(#dn-graes)"/>${totter(yHoej, 28, 5, "#3f9136")}${totter(yHoej, 40, 23, "#b2e88c", .8)}
    <g fill="#3f9136" opacity=".3">${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${(hash(i + 6) * 1000).toFixed(0)}" cy="${(150 + hash(i + 50) * 250).toFixed(0)}" rx="${(16 + hash(i + 2) * 22).toFixed(0)}" ry="5"/>`).join("")}</g></svg>`;
  // En lille blomst med stilk, blad og fem kronblade
  const blomst = (cls, style, f) => `<svg class="${cls}" style="${style}" viewBox="0 0 40 60" aria-hidden="true">
    <path d="M20 58 Q23 40 20 24" fill="none" stroke="#2f6e2c" stroke-width="4" stroke-linecap="round"/>
    <path d="M21 46 q10 -10 16 -2 q-8 6 -16 2 Z" fill="#6cc35c" stroke="#2f6e2c" stroke-width="2" stroke-linejoin="round"/>
    <g fill="${f}" stroke="${morkere(f, .3)}" stroke-width="2">${[0, 1, 2, 3, 4].map(k => `<ellipse cx="20" cy="9" rx="6" ry="8" transform="rotate(${k * 72} 20 20)"/>`).join("")}</g>
    <circle cx="20" cy="20" r="5.5" fill="#ffd84a" stroke="#b07d0a" stroke-width="2"/></svg>`;
  // Forhistorisk palme (cykas): skællet stamme og en krone af hængende blade
  const BLAD = "M0 0 C26 -30 84 -34 120 6 C92 -10 50 -12 0 10 Z";
  const stamme = y => { const l = 114 - 4 * (y - 60) / 260, r = 130 + 12 * (y - 60) / 260; return `M${l + 2} ${y} L${(l + r) / 2} ${y + 8} L${r - 2} ${y}`; };
  const palme = cls => `<svg class="dd-tree ${cls}" viewBox="0 0 240 320" aria-hidden="true">
    <path d="M110 320 C112 240 106 140 114 60 L130 60 C134 140 140 240 142 320 Z" fill="#9a6535" stroke="#6e4522" stroke-width="4" stroke-linejoin="round"/>
    <path d="${[80, 112, 144, 176, 208, 240, 272, 304].map(stamme).join(" ")}" fill="none" stroke="#6e4522" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(122 62)" stroke="#2f6e2c" stroke-width="3" stroke-linejoin="round">
      ${[[-1, 10, "#4f9e45"], [1, 10, "#4f9e45"], [-1, -22, "#5fb552"], [1, -22, "#5fb552"], [-1, -52, "#6cc35c"], [1, -52, "#6cc35c"]]
        .map(([f, r, c]) => `<path d="${BLAD}" fill="${c}" transform="scale(${f} 1) rotate(${r})"/>`).join("")}
      <circle r="11" fill="#8a5a2e" stroke="#6e4522"/></g></svg>`;
  // Bregne: buede stilke med runde småblade, der bliver mindre ud mod spidsen
  function bregneBlad(len, bend, c) {
    const P = t => [bend * t * t * len, -t * len], n = 8;
    let out = `<path d="M0 0 Q${bend * len * .5} ${-len * .5} ${P(1).join(" ")}" fill="none" stroke="#2f6e2c" stroke-width="5" stroke-linecap="round"/>`;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), [x, y] = P(t), [x2, y2] = P(t + .01);
      const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, r = 22 * (1 - t * .6);
      [-1, 1].forEach(side => out += `<ellipse cx="0" cy="0" rx="${r.toFixed(1)}" ry="${(r * .45).toFixed(1)}" fill="${c}"
        transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + side * 70).toFixed(0)}) translate(${(r * .8).toFixed(1)} 0)"/>`);
    }
    return out + `<ellipse cx="${P(1)[0]}" cy="${P(1)[1]}" rx="8" ry="8" fill="${c}"/>`;
  }
  const bregne = style => `<svg class="dd-fern" style="${style}" viewBox="-130 -140 260 150" aria-hidden="true">
    <g stroke="#2f6e2c" stroke-width="2.5">
      ${[[-62, -.8, "#4f9e45"], [62, .8, "#4f9e45"], [-36, -.5, "#5fb552"], [36, .5, "#5fb552"], [-12, -.2, "#6cc35c"], [12, .2, "#6cc35c"]]
        .map(([r, b, c]) => `<g transform="rotate(${r})">${bregneBlad(120, b, c)}</g>`).join("")}</g></svg>`;
  const DAL_SOE = `<svg class="dd-pond" viewBox="0 0 320 120" aria-hidden="true">
    <defs><radialGradient id="dd-vand" cx=".42" cy=".35" r=".7"><stop offset="0" stop-color="#c8efff"/><stop offset=".45" stop-color="#6cc3f0"/><stop offset="1" stop-color="#3b8fd0"/></radialGradient></defs>
    <ellipse cx="160" cy="72" rx="152" ry="40" fill="#e8d7a6"/>
    <ellipse cx="160" cy="72" rx="152" ry="40" fill="none" stroke="#c9b27a" stroke-width="3"/>
    <ellipse cx="160" cy="70" rx="140" ry="32" fill="url(#dd-vand)" stroke="#2f7fc0" stroke-width="3"/>
    <path d="M60 64 Q90 56 120 64 M180 80 Q210 72 240 80" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <path d="M78 80 a16 7 0 1 0 22 -4 L88 78 Z" fill="#5fb04c"/><circle cx="96" cy="76" r="4" fill="#ff9fc4"/>
    <g fill="#b9b3c4" stroke="#8f879c" stroke-width="2"><ellipse cx="22" cy="86" rx="16" ry="11"/><ellipse cx="44" cy="102" rx="13" ry="8"/>
      <ellipse cx="268" cy="104" rx="15" ry="9"/><ellipse cx="300" cy="84" rx="12" ry="9"/></g>
    <g stroke="#4f8f3a" stroke-width="4" stroke-linecap="round" fill="none"><path d="M262 76 Q260 40 266 14"/><path d="M276 80 Q278 46 286 26"/><path d="M250 80 Q244 54 240 36"/></g>
    <g fill="#8a5a2e"><rect x="261" y="16" width="10" height="26" rx="5"/><rect x="281" y="28" width="10" height="24" rx="5"/></g></svg>`;
  let dal = null, walkers = [], raf = 0, lastT = 0, hinted = false, W = 0, H = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function openDal(first) {
    // Stop æg-skærmens replik (fx hintet), ellers springes dinoens trick-replik over, fordi stemmen er optaget
    Spil.stopTalking();
    dal = document.createElement("div"); dal.className = "dd";
    dal.innerHTML = `
      <div class="dd-sun">${DAL_SOL}</div>
      ${sky("top:9%;width:clamp(110px,19vw,210px);animation-duration:70s;animation-delay:-20s")}
      ${sky("top:22%;width:clamp(80px,13vw,150px);animation-duration:95s;animation-delay:-60s")}
      ${sky("top:3%;width:clamp(70px,10vw,120px);animation-duration:120s;animation-delay:-95s")}
      ${DAL_BJERGE}${DAL_VULKAN}
      ${DAL_BAKKER}${DAL_SOE}
      ${[[8, 47, "#ff8fc0"], [47, 44, "#ffffff"], [62, 47, "#ffd84a"], [90, 43, "#c79bff"], [38, 12, "#ff8fc0"], [80, 20, "#ffffff"]].map(([x, y, f]) => blomst("dd-blomst", `left:${x}%;bottom:${y}%`, f)).join("")}
      ${palme("lille")}${palme("")}
      ${bregne("left:-2%;bottom:-1%")}${bregne("right:24%;bottom:-3%")}
      <button class="dd-back" aria-label="Tilbage til æggene">🥚</button>`;
    root.appendChild(dal);
    dal.querySelector(".dd-back").onclick = closeDal;
    measure();
    // Spred dinoerne ud fra start (hver sin plads på tværs og sin egen dybde), så de ikke står i klump
    const n = found.length, xs = Spil.shuffle([...Array(n).keys()]), ds = Spil.shuffle([...Array(n).keys()]);
    walkers = found.map((k, i) => makeWalker(byK(k), k === first, (xs[i] + rnd(.25, .75)) / n, (ds[i] + rnd(.2, .8)) / n));
    lastT = performance.now(); raf = requestAnimationFrame(step);
    addEventListener("resize", measure);
    const w = walkers.find(w => w.dn.k === first);
    if (w) later(() => dal && trick(w), 350);
  }

  function closeDal() {
    cancelAnimationFrame(raf); raf = 0; removeEventListener("resize", measure);
    if (dal) dal.remove(); dal = null; walkers = [];
    Spil.stopTalking();
  }

  function measure() {
    if (!dal) return;
    W = dal.clientWidth; H = dal.clientHeight;
    walkers.forEach(size);
  }
  // Størrelse og "dybde": dinoer længere nede er tættere på og lidt større
  function size(w) {
    const base = Math.min(H * .27, W * .3);
    w.s = w.dn.flyver ? base * .8 : base * (.72 + .28 * w.depth);
    w.el.style.width = w.s + "px";
    w.y = w.dn.flyver ? H * (.12 + .16 * w.depth) : H * (.62 + .3 * w.depth);
    w.el.style.zIndex = w.dn.flyver ? 800 : Math.round(100 + w.depth * 600);
  }

  function makeWalker(dn, centre, fx, depth) {
    const el = document.createElement("button");
    el.className = "dd-dino" + (dn.flyver ? " flyer" : "");
    el.setAttribute("aria-label", dn.navn);
    el.innerHTML = `<div class="dd-flip"><div class="dd-body">${look(dn, trinAf(dn.k), dn.flyver ? "dn-fly" : "")}</div></div>`;
    dal.appendChild(el);
    const w = { dn, el, depth, x: 0, dir: Math.random() < .5 ? -1 : 1, speed: rnd(.04, .07), pause: 0, boost: 0, busy: false };
    size(w);
    w.x = centre ? W / 2 - w.s / 2 : fx * Math.max(0, W - w.s);
    el.onclick = () => trick(w);
    place(w);
    return w;
  }

  function place(w) {
    const h = w.s * 200 / 240;
    w.el.style.transform = `translate(${w.x}px,${w.y - h}px)`;
    w.el.querySelector(".dd-flip").style.transform = `scaleX(${w.dir})`;
  }

  // Dinoerne går stille og roligt frem og tilbage og holder små pauser
  function step(t) {
    const dt = Math.min(50, t - lastT); lastT = t;
    if (!RM.matches) walkers.forEach(w => {
      const moving = !w.busy && w.pause <= 0;
      if (w.pause > 0) w.pause -= dt;
      else if (!w.busy && Math.random() < .002) w.pause = rnd(900, 2600);
      if (w.busy && w.boost <= 0) { w.el.classList.remove("walk", "run"); return; }
      const sp = w.boost > 0 ? w.speed * 7 : w.speed;
      if (w.boost > 0) w.boost -= dt;
      if (moving || w.boost > 0) {
        w.x += w.dir * sp * dt * (W / 1000);
        if (w.x < -w.s * .1) { w.x = -w.s * .1; w.dir = 1; }
        if (w.x > W - w.s * .9) { w.x = W - w.s * .9; w.dir = -1; }
      }
      w.el.classList.toggle("walk", moving && w.boost <= 0 && !w.dn.flyver);
      w.el.classList.toggle("run", w.boost > 0);
      place(w);
    });
    raf = requestAnimationFrame(step);
  }

  // Kort animation på dinoens krop (ikke på den del, der flytter den rundt)
  const body = w => w.el.querySelector(".dd-body");
  const animate = (w, frames, ms, easing = "ease-in-out") => RM.matches ? { finished: Promise.resolve() } : body(w).animate(frames, { duration: ms, easing });
  // Et punkt på dinoen i skærmkoordinater (fx hovedet), målt i tegningens 240×200-system
  function pt(w, x, y) {
    const r = body(w).getBoundingClientRect(), fx = w.dir === 1 ? x : 240 - x;
    return [r.left + fx / 240 * r.width, r.top + y / 200 * r.height];
  }

  const TRICKS = {
    trex(w) {
      [0, 380, 760].forEach(d => later(() => {
        if (!dal) return;
        animate(w, [{ transform: "none" }, { transform: "translateY(-12%)" }, { transform: "none" }], 300);
        later(() => {
          if (!dal) return;
          tone("sine", [[0, 90], [1, 35]], 0, .3, .55); noise(0, .15, 150, .3);
          if (!RM.matches) { dal.classList.remove("shake"); void dal.offsetWidth; dal.classList.add("shake"); }
          Spil.burst(...pt(w, 110, 196), "💨💨💨");
        }, 260);
      }, d));
      return 1300;
    },
    triceratops(w) {
      w.dir = w.x > W / 2 ? -1 : 1; place(w); w.boost = 1300;
      [0, 300, 600, 900].forEach(d => later(() => dal && Spil.burst(...pt(w, 40, 190), "💨"), d));
      return 1400;
    },
    stegosaurus(w) {
      animate(w, [{ filter: "hue-rotate(0deg) brightness(1)" }, { filter: "hue-rotate(180deg) brightness(1.3)" }, { filter: "hue-rotate(360deg) brightness(1)" }], 1400, "linear");
      [0, 400, 800].forEach(d => later(() => dal && Spil.burst(...pt(w, 112, 70), "✨🌈✨💖"), d));
      tone("sine", [[0, 523], [1, 1046]], .1, .9, .12);
      return 1400;
    },
    brachiosaurus(w) {
      animate(w, [{ transform: "none" }, { transform: "scale(1,1.22)", offset: .35 }, { transform: "scale(1,1.22)", offset: .7 }, { transform: "none" }], 1800);
      later(() => dal && Spil.burst(...pt(w, 200, 0), "🍃🌿🍃🌿🍃"), 700);
      later(() => dal && tone("triangle", [[0, 300], [1, 200]], 0, .08, .2), 800);
      return 1800;
    },
    ankylosaurus(w) {
      animate(w, [{ transform: "none" }, { transform: "translateY(-10%) rotate(-12deg)" }, { transform: "rotate(10deg)" }, { transform: "none" }], 700);
      later(() => dal && Spil.burst(...pt(w, 16, 125), "💥⭐💥⭐"), 450);
      return 900;
    },
    pteranodon(w) {
      const r = Math.min(H * .14, W * .14), n = 12;
      animate(w, Array.from({ length: n + 1 }, (_, i) => {
        const a = i / n * Math.PI * 2;
        return { transform: `translate(${Math.sin(a) * r * w.dir}px,${(1 - Math.cos(a)) * r}px) rotate(${-i / n * 360 * w.dir}deg)` };
      }), 1500, "ease-in-out");
      noise(.1, 1.2, 600, .12, 1, 2400);
      later(() => dal && Spil.burst(...pt(w, 120, 110), "✨⭐✨"), 1500);
      return 1600;
    },
    parasaurolophus(w) {
      HORN.forEach((_, i) => later(() => {
        if (!dal) return;
        animate(w, [{ transform: "none" }, { transform: "translateY(-6%) rotate(-4deg)" }, { transform: "none" }], 260);
        Spil.burst(...pt(w, 90, 36), i % 2 ? "🎶" : "🎵");
      }, i * 280));
      return 1300;
    },
    spinosaurus(w) {
      animate(w, [{ transform: "none" }, { transform: "translateY(-38%) rotate(-14deg)", offset: .45 }, { transform: "translateY(4%) rotate(8deg)", offset: .8 }, { transform: "none" }], 1000);
      later(() => {
        if (!dal) return;
        noise(0, .6, 1400, .35, .6, 500); noise(.05, .4, 3000, .15, .8);
        Spil.burst(...pt(w, 120, 196), "💦🌊💦💧💦🌊");
      }, 760);
      return 1200;
    },
  };

  function trick(w) {
    if (!dal || w.busy) return;
    w.busy = true; w.pause = 0;
    voice(w.dn.k);
    const ms = TRICKS[w.dn.k](w);
    if (!Spil.isTalking()) Spil.say(TRICK[w.dn.k], null, `dino-kan-${w.dn.k}`);
    later(() => { w.busy = false; w.pause = rnd(400, 1200); }, ms + 200);
  }

  Spil.register({
    id: "dino-aeg", navn: "Dino-æg", ikon: "🦖", farve: "#ffd6a5",
    start(r) {
      Spil.preload(["dino-tryk", "dino-noget", "dino-klaekker", "dino-nyt", "dino-alle", "dino-kan", "dino-guld", "dino-guld-aeg", "dino-alle-guld",
        "dino-bronze", "dino-bronze-aeg", "dino-alle-bronze", "dino-soelv", "dino-soelv-aeg", "dino-alle-soelv",
        ...DINOS.flatMap(d => [`dino-${d.k}`, `dino-kan-${d.k}`])]);
      alive = true; timers = []; dal = null; walkers = [];
      found = read("lk-dinoer").filter(k => byK(k));
      trin = {}; tvingTrin = false;
      try { const t = JSON.parse(localStorage.getItem("lk-dinoer-trin")) || {}; DINOS.forEach(d => { if (t[d.k] >= 1 && t[d.k] <= 3) trin[d.k] = t[d.k] | 0; }); } catch (e) {}
      read("lk-dinoer-guld").forEach(k => { if (byK(k)) trin[k] = 3; }); // guld-dinoer fra før bronze og sølv fandtes
      try { localStorage.removeItem("lk-dinopleje"); } catch (e) {} // rester fra den gamle pleje-del
      hinted = found.length > 1;
      // Dybe links til test (index.html?spil=dino-aeg&dyb=...):
      //   sandkasse  dino-dalen med alle 8 dinoer     samling  æggene med hele samlingen
      //   bronze / soelv / guld  æggene med alle dinoer i det metal     klaek  et æg, der klækker ved næste tryk
      //   klaek-bronze / klaek-soelv / klaek-guld  et metal-æg, der klækker ved næste tryk
      //   dal-<dino> dino-dalen, og den dino laver sit trick (fx dal-trex)
      const dyb = Spil.dyb || "";
      demo = !!dyb;
      const mNr = n => METAL.findIndex(m => m && m.n === n);
      if (demo) {
        found = DINOS.map(d => d.k); trin = {}; hinted = true;
        const t = mNr(dyb), kt = dyb.startsWith("klaek-") ? mNr(dyb.slice(6)) : 0;
        if (t > 0) DINOS.forEach(d => trin[d.k] = t);
        if (kt > 0) { DINOS.forEach(d => { if (kt > 1) trin[d.k] = kt - 1; }); tvingTrin = true; }
      }
      if (dyb === "klaek") found = found.slice(0, 4);
      r.innerHTML = `<div class="dn">
        <div class="dn-bg">
          <div class="dd-sun">${DAL_SOL}</div>
          ${sky("top:7%;width:clamp(100px,17vw,190px);animation-duration:80s;animation-delay:-30s")}
          ${sky("top:20%;width:clamp(70px,11vw,130px);animation-duration:110s;animation-delay:-85s")}
          ${DAL_BJERGE}
          <div class="dn-volcano">${DAL_VULKAN}</div>
          <div class="dn-palm" style="left:0">${palme("")}</div>
          <div class="dn-palm ekstra" style="left:13vw;height:min(26vh,26vw);bottom:38%">${palme("")}</div>
          ${DN_BAKKE}
          ${[[5, 37, "#ff8fc0"], [21, 40, "#ffffff"], [73, 40.5, "#ffd84a"], [86, 37.5, "#c79bff"], [94, 34, "#ff8fc0"]].map(([x, y, f]) => blomst("dn-blomst", `left:${x}%;bottom:${y}%`, f)).join("")}
          ${bregne("left:-3%;bottom:16%")}${bregne("right:-3%;bottom:16%").replace("dd-fern", "dd-fern to")}
        </div>
        <div class="dn-name"></div>
        <div class="dn-main"><div class="dn-spot"></div></div>
        <div class="dn-valley" aria-label="Dino-samlingen"></div></div>`;
      root = r.querySelector(".dn");
      drawValley(); newEgg(true);
      if (dyb.startsWith("klaek")) {
        taps = TAPS - 1;
        q(".dn-cracks").innerHTML = CRACKS.slice(0, taps).map(d => `<path class="dn-crack" d="${d}"/>`).join("");
      }
      if (dyb === "sandkasse") openDal();
      if (dyb.startsWith("dal-") && byK(dyb.slice(4))) openDal(dyb.slice(4));
    },
    stop() { alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf); raf = 0; removeEventListener("resize", measure); dal = null; walkers = []; }
  });

  Spil.DINOS = DINOS; Spil.dinoSvg = svg; // bruges af test-galleriet
})();
