// Spil: Mal — et roligt fingermaleri. Man maler med fingeren, flere fingre på én gang.
// Der er farver, regnbue-pensel, glimmer, stempler, malebog og et galleri, hvor den gamle
// tegning gemmes automatisk, når man laver en ny eller går hjem. Intet er forkert, intet går tabt.
(function () {
  const PAPER = "#fffdf7";
  const COLORS = [
    { k: "roed", navn: "rød", c: "#ff5252", key: "farve-roed" },
    { k: "orange", navn: "orange", c: "#ff9f1c", key: "farve-orange" },
    { k: "gul", navn: "gul", c: "#ffd21f", key: "farve-gul" },
    { k: "groen", navn: "grøn", c: "#43c463", key: "farve-groen" },
    { k: "blaa", navn: "blå", c: "#3d8bfd", key: "farve-blaa" },
    { k: "lilla", navn: "lilla", c: "#a566ff", key: "farve-lilla" },
    { k: "lyseroed", navn: "lyserød", c: "#ff7fc4", key: "farve-lyseroed" },
    { k: "brun", navn: "brun", c: "#9c5b2f", key: "mal-brun" },
    { k: "sort", navn: "sort", c: "#2b2b2b", key: "mal-sort" },
    { k: "hvid", navn: "hvid", c: "#ffffff", key: "mal-hvid" },
  ];
  const STAMPS = ["⭐", "❤️", "🌸", "☀️", "🦋", "🐞"];
  const OUTLINES = [
    { k: "fisk", navn: "en fisk" },
    { k: "hus", navn: "et hus" },
    { k: "sol", navn: "en sol" },
    { k: "bil", navn: "en bil" },
    { k: "sommerfugl", navn: "en sommerfugl" },
    { k: "kat", navn: "en kat" },
    { k: "traktor", navn: "en traktor" },
    { k: "tog", navn: "et tog" },
    { k: "blomst", navn: "en blomst" },
    { k: "raket", navn: "en raket" },
    { k: "brandbil", navn: "en brandbil" },
    { k: "elefant", navn: "en elefant" },
    { k: "regnbue", navn: "en regnbue" },
    { k: "bamse", navn: "en bamse" },
    { k: "baad", navn: "en båd" },
    { k: "aebletrae", navn: "et æbletræ" },
    { k: "snemand", navn: "en snemand" },
    { k: "ugle", navn: "en ugle" },
    { k: "froe", navn: "en frø" },
    { k: "is", navn: "en is" },
  ];
  const TOOL_TXT = {
    brush: ["Pensel!", "mal-pensel"],
    rainbow: ["Regnbue-pensel!", "mal-regnbue"],
    glitter: ["Glimmer!", "mal-glimmer"],
  };

  // Malebogens omrids (viewBox 0 0 800 600). Tykke streger, ingen udfyldning.
  // Nye tegninger lægges til sidst, så gamle nøgler og rækkefølgen bevares.
  const ART = {
    fisk: `
        <path d="M175 300 C215 190 360 160 460 228 C505 258 532 286 545 300 C532 314 505 342 460 372 C360 440 215 410 175 300 Z"/>
        <path d="M545 300 L690 218 C668 264 668 336 690 382 Z"/>
        <path d="M395 202 C420 156 462 142 500 152 C474 182 466 208 468 232"/>
        <path d="M395 398 C420 444 462 458 500 448 C474 418 466 392 468 368"/>
        <circle cx="272" cy="268" r="17"/>`,
    hus: `
        <path d="M190 535 L190 305 L400 168 L610 305 L610 535 Z"/>
        <path d="M140 305 L400 130 L660 305"/>
        <path d="M338 535 L338 402 L462 402 L462 535"/>
        <path d="M232 346 L322 346 L322 436 L232 436 Z"/>
        <path d="M232 391 L322 391 M277 346 L277 436"/>
        <path d="M505 201 L505 150 L560 150 L560 238"/>`,
    sol: (() => {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a = i * Math.PI / 6;
        return `<path d="M${(400 + Math.cos(a) * 150).toFixed(1)} ${(300 + Math.sin(a) * 150).toFixed(1)} L${(400 + Math.cos(a) * 208).toFixed(1)} ${(300 + Math.sin(a) * 208).toFixed(1)}"/>`;
      }).join("");
      return `<circle cx="400" cy="300" r="112"/>${rays}`;
    })(),
    bil: `
        <path d="M120 415 L120 345 C120 325 134 314 156 314 L246 314 L306 232 L492 232 L556 314 L648 326 C668 330 680 344 680 364 L680 415 Z"/>
        <path d="M320 252 L378 252 L378 314 L270 314 Z"/>
        <path d="M398 252 L470 252 L514 314 L398 314 Z"/>
        <circle cx="240" cy="428" r="58"/>
        <circle cx="556" cy="428" r="58"/>`,
    sommerfugl: `
        <ellipse cx="400" cy="320" rx="20" ry="92"/>
        <path d="M382 292 C330 180 205 168 172 238 C142 302 240 350 380 330 Z"/>
        <path d="M418 292 C470 180 595 168 628 238 C658 302 560 350 420 330 Z"/>
        <path d="M382 352 C320 370 220 410 240 480 C258 540 362 470 382 408 Z"/>
        <path d="M418 352 C480 370 580 410 560 480 C542 540 438 470 418 408 Z"/>
        <path d="M388 232 C372 180 340 156 312 146"/>
        <path d="M412 232 C428 180 460 156 488 146"/>
        <circle cx="310" cy="144" r="10"/><circle cx="490" cy="144" r="10"/>`,
    kat: `
        <circle cx="400" cy="330" r="140"/>
        <path d="M296 240 L272 114 L392 196"/>
        <path d="M504 240 L528 114 L408 196"/>
        <circle cx="350" cy="300" r="18"/>
        <circle cx="450" cy="300" r="18"/>
        <path d="M400 342 L378 324 L422 324 Z"/>
        <path d="M400 342 C400 372 370 382 352 366"/>
        <path d="M400 342 C400 372 430 382 448 366"/>
        <path d="M270 318 L190 300 M270 342 L192 348 M530 318 L610 300 M530 342 L608 348"/>`,

    traktor: `
        <circle cx="530" cy="450" r="105"/>
        <circle cx="530" cy="450" r="38"/>
        <circle cx="200" cy="450" r="75"/>
        <circle cx="200" cy="450" r="26"/>
        <path d="M100 360 L100 300 Q100 276 126 276 L318 276 L318 180 Q318 156 344 156 L560 156 Q588 156 588 184 L588 360 Z"/>
        <path d="M352 204 L532 204 Q550 204 550 222 L550 276 L352 276 Z"/>
        <path d="M160 276 L160 190 M140 190 L180 190"/>`,
    tog: `
        <path d="M100 402 L100 220 Q100 186 134 186 L288 186 L288 402 Z"/>
        <path d="M142 232 L246 232 Q262 232 262 248 L262 320 L142 320 Z"/>
        <path d="M288 402 L288 300 Q288 278 312 278 L600 278 Q630 278 630 308 L630 402 Z"/>
        <path d="M535 278 L548 196 L608 196 L621 278"/>
        <path d="M528 196 L628 196"/>
        <path d="M400 278 Q400 232 436 232 Q472 232 472 278"/>
        <circle cx="190" cy="430" r="58"/>
        <circle cx="190" cy="430" r="16"/>
        <circle cx="400" cy="430" r="58"/>
        <circle cx="400" cy="430" r="16"/>
        <circle cx="560" cy="430" r="58"/>
        <circle cx="560" cy="430" r="16"/>`,
    blomst: `
        <circle cx="400" cy="90" r="70"/>
        <circle cx="543" cy="194" r="70"/>
        <circle cx="488" cy="361" r="70"/>
        <circle cx="312" cy="361" r="70"/>
        <circle cx="257" cy="194" r="70"/>
        <circle cx="400" cy="240" r="80"/>
        <path d="M400 320 L400 548"/>
        <path d="M395 470 C345 425 255 430 245 480 C295 525 375 518 395 478 Z"/>
        <path d="M405 505 C455 460 530 465 540 510 C495 550 430 548 405 512 Z"/>
        <path d="M250 548 L550 548"/>`,
    raket: `
        <path d="M400 60 C470 140 502 232 502 330 L502 420 L298 420 L298 330 C298 232 330 140 400 60 Z"/>
        <circle cx="400" cy="250" r="54"/>
        <path d="M298 330 L208 470 L298 420 Z"/>
        <path d="M502 330 L592 470 L502 420 Z"/>
        <path d="M330 420 L318 470 L482 470 L470 420 Z"/>
        <path d="M340 470 C350 530 375 562 400 576 C425 562 450 530 460 470 Z"/>`,
    brandbil: `
        <path d="M110 402 L110 224 Q110 196 140 196 L292 196 Q318 196 318 226 L318 402 Z"/>
        <path d="M148 240 L282 240 Q294 240 294 254 L294 326 L148 326 Z"/>
        <path d="M318 402 L318 306 Q318 280 348 280 L674 280 Q702 280 702 308 L702 402 Z"/>
        <path d="M356 248 L666 186 L672 212 L362 274"/>
        <path d="M410 236 L416 262 M470 224 L476 250 M530 212 L536 238 M590 200 L596 226 M650 188 L656 214"/>
        <path d="M180 196 L180 168 Q180 154 196 154 L236 154 Q250 154 250 168 L250 196"/>
        <circle cx="220" cy="432" r="64"/>
        <circle cx="220" cy="432" r="22"/>
        <circle cx="570" cy="432" r="64"/>
        <circle cx="570" cy="432" r="22"/>
        <circle cx="505" cy="340" r="42"/>`,
    elefant: `
        <ellipse cx="480" cy="300" rx="205" ry="130"/>
        <path d="M320 381 L320 522 Q320 548 346 548 L349 548 Q375 548 375 522 L375 412"/>
        <path d="M395 418 L395 522 Q395 548 421 548 L424 548 Q450 548 450 522 L450 429"/>
        <path d="M520 427 L520 522 Q520 548 546 548 L549 548 Q575 548 575 522 L575 415"/>
        <path d="M595 408 L595 522 Q595 548 621 548 L624 548 Q650 548 650 522 L650 373"/>
        <circle cx="190" cy="262" r="88"/>
        <path d="M125 322 C83 390 89 470 135 504 Q161 520 178 497 Q187 482 174 468 C153 438 157 393 193 343"/>
        <ellipse cx="240" cy="285" rx="42" ry="68" transform="rotate(8 240 285)"/>
        <circle cx="158" cy="234" r="13"/>
        <path d="M683 290 C718 312 722 362 706 402 M706 402 L692 424 M706 402 L718 426"/>`,
    regnbue: `
        <path d="M100 460 A300 300 0 0 1 700 460"/>
        <path d="M160 460 A240 240 0 0 1 640 460"/>
        <path d="M220 460 A180 180 0 0 1 580 460"/>
        <path d="M280 460 A120 120 0 0 1 520 460"/>
        <path d="M80 510 C58 510 48 492 52 474 C56 454 74 446 92 450 C94 420 120 404 144 414 C156 388 192 384 208 406 C232 390 264 400 270 426 C296 426 310 446 306 468 C322 482 316 506 296 512 Z"/>
        <g transform="translate(800 0) scale(-1 1)"><path d="M80 510 C58 510 48 492 52 474 C56 454 74 446 92 450 C94 420 120 404 144 414 C156 388 192 384 208 406 C232 390 264 400 270 426 C296 426 310 446 306 468 C322 482 316 506 296 512 Z"/></g>`,
    bamse: `
        <ellipse cx="400" cy="214" rx="58" ry="42"/>
        <ellipse cx="400" cy="198" rx="20" ry="14"/>
        <circle cx="358" cy="150" r="13"/>
        <circle cx="442" cy="150" r="13"/>
        <ellipse cx="318" cy="518" rx="66" ry="46"/>
        <ellipse cx="482" cy="518" rx="66" ry="46"/>
        <circle cx="400" cy="168" r="106"/>
        <path d="M423 498 A74 84 0 0 1 377 498"/>
        <path d="M347 477 A74 84 0 1 1 453 477"/>
        <path d="M424 540 A130 142 0 0 1 376 540"/>
        <path d="M290 476 A130 142 0 0 1 358 266"/>
        <path d="M442 266 A130 142 0 0 1 510 476"/>
        <path d="M275 439 A42 86 28 1 1 313 295"/>
        <path d="M487 295 A42 86 -28 1 1 525 439"/>
        <path d="M302 127 A46 46 0 1 1 362 69"/>
        <path d="M438 69 A46 46 0 1 1 498 127"/>
        <path d="M400 212 L400 228 M376 238 Q400 252 424 238"/>`,
    baad: `
        <path d="M130 380 L670 380 C650 448 606 498 540 504 L260 504 C194 498 150 448 130 380 Z"/>
        <path d="M400 380 L400 100"/>
        <path d="M420 120 L620 350 L420 350 Z"/>
        <path d="M380 150 L210 350 L380 350 Z"/>
        <path d="M400 100 L470 122 L400 148 Z"/>`,
    aebletrae: `
        <path d="M400 80 C470 80 522 118 534 176 C592 182 624 232 610 288 C632 344 590 392 534 392 L266 392 C210 392 168 344 190 288 C176 232 208 182 266 176 C278 118 330 80 400 80 Z"/>
        <path d="M362 392 L362 540 L438 540 L438 392"/>
        <circle cx="330" cy="190" r="34"/>
        <circle cx="472" cy="178" r="34"/>
        <circle cx="400" cy="270" r="34"/>
        <circle cx="288" cy="290" r="34"/>
        <circle cx="512" cy="300" r="34"/>
        <path d="M200 548 L600 548"/>`,
    snemand: `
        <circle cx="400" cy="470" r="115"/>
        <circle cx="400" cy="320" r="88"/>
        <circle cx="400" cy="180" r="66"/>
        <path d="M348 118 L348 58 L452 58 L452 118"/>
        <path d="M316 118 L484 118"/>
        <circle cx="376" cy="166" r="11"/>
        <circle cx="424" cy="166" r="11"/>
        <path d="M400 186 L472 202 L400 214 Z"/>
        <circle cx="400" cy="292" r="14"/>
        <circle cx="400" cy="330" r="14"/>
        <circle cx="400" cy="368" r="14"/>
        <path d="M312 300 L208 250 M258 274 L244 236"/>
        <path d="M488 300 L592 250 M542 274 L556 236"/>`,
    ugle: `
        <circle cx="330" cy="265" r="30"/>
        <circle cx="470" cy="265" r="30"/>
        <circle cx="330" cy="265" r="66"/>
        <circle cx="470" cy="265" r="66"/>
        <ellipse cx="248" cy="432" rx="44" ry="96" transform="rotate(12 248 432)"/>
        <ellipse cx="552" cy="432" rx="44" ry="96" transform="rotate(-12 552 432)"/>
        <ellipse cx="400" cy="466" rx="90" ry="60"/>
        <path d="M520 479 A174 220 0 0 1 280 479"/>
        <path d="M229 362 A174 220 0 1 1 571 362"/>
        <path d="M300 140 L268 62 L356 107"/>
        <path d="M500 140 L532 62 L444 107"/>
        <path d="M400 330 L370 358 L400 396 L430 358 Z"/>
        <path d="M346 528 L338 558 M362 534 L360 564 M378 538 L382 566"/>
        <path d="M422 538 L418 566 M438 534 L440 564 M454 528 L462 558"/>`,
    froe: `
        <path d="M400 280 C500 280 570 350 570 440 C570 525 500 555 400 555 C300 555 230 525 230 440 C230 350 300 280 400 280 Z"/>
        <circle cx="318" cy="225" r="70"/>
        <circle cx="482" cy="225" r="70"/>
        <circle cx="318" cy="215" r="30"/>
        <circle cx="482" cy="215" r="30"/>
        <path d="M330 440 Q400 500 470 440"/>
        <ellipse cx="300" cy="540" rx="70" ry="35"/>
        <ellipse cx="500" cy="540" rx="70" ry="35"/>`,
    is: `
        <path d="M300 352 L400 584 L500 352"/>
        <path d="M334 425 L466 425 M360 485 L440 485"/>
        <circle cx="400" cy="160" r="88"/>
        <path d="M285 345 C255 330 250 270 285 235 C300 215 330 210 400 210 C470 210 500 215 515 235 C550 270 545 330 515 345 Q490 360 462 346 Q431 366 400 346 Q369 366 338 346 Q310 360 285 345 Z"/>
        <circle cx="400" cy="58" r="26"/>
        <path d="M400 32 Q418 12 442 18"/>`,
  };
  function outlineArt(k) { return ART[k] || ART.kat; }

  Spil.css("css-mal", `
    .ma{position:relative;height:100%;display:flex;flex-direction:row;gap:clamp(6px,1vh,10px);box-sizing:border-box;
      --sz:clamp(48px,min(7.6vh,15vw),76px);
      padding:max(8px,env(safe-area-inset-top,0px)) max(8px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));
      background:linear-gradient(160deg,#e9f5ff,#f4ecff 55%,#fff1e4);font-family:var(--display)}
    .ma-wrap{position:relative;flex:1;min-width:0;min-height:0;border-radius:clamp(14px,2.6vh,26px);overflow:hidden;background:${PAPER};
      box-shadow:0 6px 0 rgba(31,58,95,.16),inset 0 0 0 2px rgba(31,58,95,.08);touch-action:none}
    .ma-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
    /* Pensel-markør (mus/pen): viser farve og størrelse, med mørk + lys kant, så den ses på alle baggrunde */
    @media (hover:hover){.ma-canvas{cursor:none}}
    .ma-cur{position:absolute;left:0;top:0;z-index:4;pointer-events:none;border-radius:50%;transform:translate(-50%,-50%);
      box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(31,58,95,.8),0 2px 6px 4px rgba(31,58,95,.18)}
    .ma-cur.emo{box-shadow:none;background:none!important;display:grid;place-items:center;line-height:1;
      filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 1px rgba(31,58,95,.9))}
    .ma-outline{position:absolute;inset:0;z-index:2;pointer-events:none}
    .ma-outline svg{width:100%;height:100%;display:block;fill:none;stroke:#26364a;stroke-width:10;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
    .ma-rail{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(5px,1.4vh,14px);flex:none}
    .ma-colors,.ma-tools{display:grid;grid-template-columns:repeat(2,auto);gap:clamp(4px,1vh,9px);justify-content:center}
    .ma-color,.ma-tool{width:var(--sz);height:var(--sz);display:grid;place-items:center;padding:0;
      font-size:calc(var(--sz)*.52);line-height:1;background:#fff;box-shadow:0 4px 0 rgba(31,58,95,.18);transition:transform .12s}
    .ma-color{border-radius:50%;box-shadow:0 4px 0 rgba(31,58,95,.18),inset 0 0 0 3px rgba(31,58,95,.14)}
    .ma-tool{border-radius:28%}
    .ma-tool svg{width:84%;height:84%;fill:none;stroke:#26364a;stroke-width:30;stroke-linecap:round;stroke-linejoin:round}
    .ma-tool svg > :first-child{fill:var(--ma-col,#ff5252)} /* en malet fisk i den valgte farve = malebogen */
    .ma-color.on{transform:scale(1.12);box-shadow:0 0 0 4px #fff,0 0 0 8px var(--ink),0 5px 0 rgba(31,58,95,.2)}
    .ma-tool.on{background:var(--sun);box-shadow:0 4px 0 #d9a21a,inset 0 0 0 3px #fff}
    .ma-tool[data-tool="thin"].on,.ma-tool[data-tool="thick"].on{background:#fff;box-shadow:0 4px 0 rgba(31,58,95,.18),inset 0 0 0 4px var(--ink)}
    .ma-color:active,.ma-tool:active{transform:translateY(3px) scale(.96)}
    .ma-dot{width:34%;aspect-ratio:1;border-radius:50%;background:var(--ma-col,#1f3a5f);box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(31,58,95,.55)}
    .ma-tool[data-tool="thick"] .ma-dot{width:58%}
    .ma-mini{font-size:calc(var(--sz) * .28);line-height:1}
    .ma-tool[data-tool="thick"] .ma-mini{font-size:calc(var(--sz) * .56)}
    .ma-confirm{position:absolute;inset:0;z-index:6;display:grid;place-items:center;pointer-events:none}
    .ma-yes{pointer-events:auto;width:clamp(110px,22vh,190px);aspect-ratio:1;border-radius:50%;color:#fff;
      font-size:clamp(56px,11vh,96px);background:radial-gradient(circle at 35% 30%,#a8f0b0,#43c463 62%,#2e9b46);
      box-shadow:0 10px 0 #1f7a34,0 0 0 9px rgba(255,255,255,.85);animation:ma-pulse 1s ease-in-out infinite}
    .ma-yes:active{transform:scale(.94)}
    @keyframes ma-pulse{
      0%,100%{box-shadow:0 10px 0 #1f7a34,0 0 0 9px rgba(255,255,255,.85)}
      50%{box-shadow:0 10px 0 #1f7a34,0 0 0 22px rgba(255,255,255,.92),0 0 52px 18px rgba(122,240,152,.85)}
    }
    .ma-wipe{position:absolute;inset:0;z-index:5;background:${PAPER};will-change:transform;
      box-shadow:-16px 0 26px rgba(31,58,95,.2)}
    .ma-wipe::after{content:"🧽";position:absolute;right:0;top:50%;transform:translate(52%,-50%) rotate(-12deg);font-size:clamp(48px,10vh,96px)}
    .ma-wipe::before{content:"💦";position:absolute;right:6%;top:16%;font-size:clamp(28px,6vh,56px)}
    .ma-picker{position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;
      padding:max(14px,env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) max(14px,env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px));
      background:rgba(31,58,95,.24)}
    .ma-sheet{position:relative;display:flex;flex-direction:column;background:#fff;border-radius:28px;box-sizing:border-box;
      padding:clamp(14px,3vh,24px) clamp(14px,3vw,28px);
      box-shadow:0 10px 0 rgba(31,58,95,.2);width:100%;max-width:620px;max-height:100%;min-height:0;overflow:visible}
    .ma-sheet-in{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,1.6vh,14px);
      justify-content:center;align-content:start;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;
      padding:6px 4px 8px;touch-action:pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .ma-pick{width:100%;min-width:0;aspect-ratio:1;border-radius:22px;background:#fff8ee;
      box-shadow:0 4px 0 rgba(31,58,95,.16);display:grid;place-items:center;padding:5px;font-size:clamp(36px,7vh,60px)}
    .ma-pick svg{width:100%;height:100%;fill:none;stroke:#26364a;stroke-width:34;stroke-linecap:round;stroke-linejoin:round}
    .ma-pick:active{transform:translateY(4px)}
    .ma-dice{flex:none;display:flex;align-items:center;justify-content:center;gap:10px;height:clamp(56px,9vh,72px);
      margin:0 4px clamp(8px,1.6vh,14px);border-radius:20px;background:var(--sun);box-shadow:0 4px 0 #d9a21a;
      font-size:clamp(28px,5vh,40px);color:#4a3200;line-height:1}
    .ma-dice span{font-size:clamp(16px,2.6vh,24px);font-weight:800}
    .ma-dice:active{transform:translateY(3px)}
    .ma-close{position:absolute;z-index:3;top:calc(1.5vh + env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));
      width:clamp(52px,8vh,72px);aspect-ratio:1;border-radius:50%;background:#fff;
      box-shadow:0 5px 0 rgba(31,58,95,.2);font-size:clamp(22px,3.6vh,32px)}
    .ma-sheet .ma-close{top:-14px;right:-10px}
    @media (max-width:620px){.ma-sheet-in{grid-template-columns:repeat(2,minmax(0,1fr))}}
    /* Smal skærm: arket starter under 🏠-knappen, så den ikke dækker "Overrask mig" */
    @media (max-width:800px){.ma-picker{padding-top:calc(2vh + env(safe-area-inset-top,0px) + clamp(52px,8vh,76px) + 14px)}}
    .ma-gal{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;background:${PAPER};touch-action:pan-y}
    .ma-gal h2{margin:calc(2vh + env(safe-area-inset-top,0px)) 92px 1.5vh;min-height:clamp(52px,8vh,76px);display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:clamp(22px,4.4vh,42px)}
    .ma-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(120px,min(22vh,38vw),200px),1fr));
      gap:clamp(10px,2vw,22px);padding:1vh max(16px,3vw) calc(3vh + env(safe-area-inset-bottom,0px));align-content:start;justify-items:center;touch-action:pan-y}
    .ma-card{width:100%;max-width:240px;background:#fff;padding:8px;border-radius:12px;line-height:0;
      box-shadow:0 6px 14px rgba(31,58,95,.18)}
    .ma-card img{width:100%;height:auto;display:block;border-radius:6px}
    .ma-card:active{transform:translateY(4px)}
    .ma-empty{grid-column:1/-1;text-align:center;font-size:clamp(84px,20vh,180px);opacity:.55;padding-top:8vh}
    .ma-big{position:fixed;inset:0;z-index:15;display:grid;place-items:center;padding:clamp(12px,3vh,30px);background:rgba(31,58,95,.68)}
    .ma-big img{max-width:100%;max-height:100%;border-radius:10px;background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.35)}
    .ma-big .ma-close{position:fixed}
    /* iPad: tynd og tyk står på samme række (malebog, ny og galleri rykkes efter dem); telefon: som i koden */
    .ma-tool[data-tool="malebog"],.ma-tool[data-tool="new"],.ma-tool[data-tool="gallery"]{order:1}
    @media (orientation:portrait){
      .ma{flex-direction:column}
      .ma-tool[data-tool]{order:0}
      .ma-colors,.ma-tools{grid-template-columns:repeat(5,auto)}
      .ma-rail{gap:clamp(5px,1.2vh,12px)}
      .ma-gal h2{font-size:clamp(20px,6vw,34px)}
    }
    @media (max-height:560px){.ma{--sz:clamp(34px,8.4vh,54px)}}
    @media (prefers-reduced-motion:reduce){
      .ma-yes{animation:none}
      .ma-color,.ma-tool,.ma-card{transition:none}
    }
  `);

  let root, canvas, ctx, base, bctx, wrap, alive, timers, ro;
  let W = 0, H = 0;
  let color = COLORS[0].c, tool = "brush", stamp = STAMPS[0], thick = true;
  let dirty = false, confirming = false, confirmTimer = 0;
  let gallery = [], outlineKey = null, outlineImg = null;
  const active = new Map();
  let brushSound = null, noiseBuf = null, lastTwinkle = 0, wipeAnim = null;
  const levelCache = new Map();
  const q = s => root.querySelector(s);
  const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };

  /* ---------- Farver og blød kant ---------- */
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => {
    const A = hex2rgb(a), B = hex2rgb(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
  };
  function levelsFor(c, light) {
    if (light) return ["#dfe6f0", "#eef3f9", "#ffffff"]; // hvid skal kunne ses på det hvide papir
    let L = levelCache.get(c);
    if (!L) { L = [mix(c, PAPER, .5), mix(c, PAPER, .25), c]; levelCache.set(c, L); }
    return L;
  }

  /* ---------- Lærredet: en "base" med færdige streger + de streger, der er undervejs ---------- */
  function copyCanvas(src) {
    const c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
    return c;
  }

  function fit() {
    if (!canvas || !wrap) return;
    const r = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const oldMain = canvas.width && canvas.height ? copyCanvas(canvas) : null;
    const oldBase = base && base.width && base.height ? copyCanvas(base) : null;
    W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    base = document.createElement("canvas");
    base.width = canvas.width; base.height = canvas.height;
    bctx = base.getContext("2d");
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.lineCap = "round"; bctx.lineJoin = "round";
    const src = oldBase || oldMain;
    if (src) {
      bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.drawImage(src, 0, 0, canvas.width, canvas.height);
      bctx.restore();
    }
    renderAll();
    styleCursor(); // penslens størrelse følger lærredets størrelse
  }

  function renderAll() {
    if (!ctx || !base) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    active.forEach(st => { if (st.mode === "brush") drawStroke(ctx, st); });
  }

  function strokePath(st) {
    const p = new Path2D();
    const pts = st.pts, n = pts.length;
    if (n < 2) { p.moveTo(pts[0].x, pts[0].y); p.lineTo(pts[0].x + .01, pts[0].y); return p; }
    p.moveTo(pts[0].x, pts[0].y);
    if (n === 2) { p.lineTo(pts[1].x, pts[1].y); return p; }
    for (let i = 1; i < n - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      p.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    p.quadraticCurveTo(pts[n - 2].x, pts[n - 2].y, pts[n - 1].x, pts[n - 1].y);
    return p;
  }

  function rainbowStyle(g, st, light) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    st.pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    if (x1 - x0 < 2 && y1 - y0 < 2) { x1 = x0 + 2; y1 = y0 + 2; }
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i <= 10; i++) {
      const hue = (st.hue0 + i / 10 * 300) % 360;
      gr.addColorStop(i / 10, `hsl(${hue.toFixed(0)},92%,${light}%)`);
    }
    return gr;
  }

  function drawStroke(g, st) {
    const path = strokePath(st);
    g.save();
    g.lineCap = "round"; g.lineJoin = "round";
    const layers = st.rainbow
      ? [[1.5, 82], [1.22, 70], [1, 57]]
      : levelsFor(st.color, st.light).map((c, i, a) => [i === 0 ? 1.5 : i === 1 ? 1.22 : 1, c]);
    layers.forEach(([f, c]) => {
      g.strokeStyle = st.rainbow ? rainbowStyle(g, st, c) : c;
      g.lineWidth = st.width * f;
      g.stroke(path);
    });
    g.restore();
  }

  const brushWidth = () => {
    const m = Math.min(W, H);
    return thick ? Math.max(26, m * .06) : Math.max(12, m * .025);
  };
  const isLight = c => c.toLowerCase() === "#ffffff";

  /* ---------- Små lyde (pensel, plop, glimmer) ---------- */
  function blip(freqs, dur, type, vol) {
    try {
      const a = Spil.audio(), t = a.currentTime;
      freqs.forEach((f, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = type; o.frequency.value = f;
        const s = t + i * dur;
        g.gain.setValueAtTime(.0001, s);
        g.gain.exponentialRampToValueAtTime(vol, s + .01);
        g.gain.exponentialRampToValueAtTime(.0001, s + dur * 1.6);
        o.connect(g); g.connect(a.destination);
        o.start(s); o.stop(s + dur * 1.8);
      });
    } catch (e) {}
  }
  const plop = () => blip([640, 300], .075, "sine", .13);
  function twinkle() {
    const now = performance.now();
    if (now - lastTwinkle < 110) return;
    lastTwinkle = now;
    blip([1900 + Math.random() * 1300], .05, "sine", .045);
  }

  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const a = Spil.audio(), len = Math.floor(a.sampleRate * 1.5);
    const b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = last * .9 + w * .1; d[i] = last * .5; }
    noiseBuf = b;
    return b;
  }
  function startBrushSound() {
    if (brushSound) return;
    try {
      const a = Spil.audio(), t = a.currentTime;
      const src = a.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
      const filt = a.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 600; filt.Q.value = .5;
      const gain = a.createGain(); gain.gain.value = .0001;
      src.connect(filt); filt.connect(gain); gain.connect(a.destination);
      src.start(t);
      brushSound = { a, src, filt, gain };
      brushLevel(.1);
    } catch (e) { brushSound = null; }
  }
  function brushLevel(v) {
    if (!brushSound) return;
    try {
      const t = brushSound.a.currentTime;
      brushSound.gain.gain.setTargetAtTime(.012 + v * .1, t, .05);
      brushSound.filt.frequency.setTargetAtTime(450 + v * 1900, t, .08);
    } catch (e) {}
  }
  function stopBrushSound() {
    if (!brushSound) return;
    try {
      const t = brushSound.a.currentTime;
      brushSound.gain.gain.cancelScheduledValues(t);
      brushSound.gain.gain.setTargetAtTime(.0001, t, .03);
      brushSound.src.stop(t + .12);
    } catch (e) {}
    brushSound = null;
  }

  /* ---------- Stempler og glimmer (tegnes både på lærredet og på basen) ---------- */
  const canvases = () => bctx ? [ctx, bctx] : [ctx];

  function stampAt(x, y) {
    const m = Math.min(W, H);
    // tynd/tyk gælder også stempler: små eller store
    const size = thick ? Math.max(64, m * (.13 + Math.random() * .05)) : Math.max(40, m * (.065 + Math.random() * .025));
    const rot = Math.random() * .5 - .25;
    const emoji = stamp;
    canvases().forEach(g => {
      g.save();
      g.translate(x, y); g.rotate(rot);
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.fillText(emoji, 0, 0);
      g.restore();
    });
    dirty = true;
    plop();
    const L = levelsFor(isLight(color) ? "#cfd8e6" : color, false);
    const dots = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, r = size * (.45 + Math.random() * .35);
      dots.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, s: 2 + Math.random() * 4, c: i % 2 ? "#fff" : L[1] });
    }
    canvases().forEach(g => dots.forEach(d => {
      g.fillStyle = d.c;
      g.beginPath(); g.arc(d.x, d.y, d.s, 0, Math.PI * 2); g.fill();
    }));
  }

  // Et lille firtakket glimt med buede sider og en hvid prik i midten
  function glint(g, x, y, r, c) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r * .8, y);
    g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r * .8, y);
    g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(x, y, Math.max(1, r * .16), 0, Math.PI * 2); g.fill();
  }

  function sparkleAt(x, y, n = 7) {
    const L = levelsFor(isLight(color) ? "#cfd8e6" : color, false);
    const dots = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = thick ? 8 + Math.random() * 54 : 4 + Math.random() * 24;
      const star = Math.random() < .3;
      const rr = Math.random();
      dots.push({
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, star,
        s: star ? (thick ? 9 + Math.random() * 9 : 5 + Math.random() * 4)
          : (thick ? 1.5 + Math.random() * 4.5 : 1 + Math.random() * 2.5),
        // hvide prikker ses kun oven på maling, så der er færre af dem
        c: !star && rr < .2 ? "#ffffff" : (rr < .55 ? L[1] : L[2]),
      });
    }
    canvases().forEach(g => dots.forEach(d => {
      if (d.star) return glint(g, d.x, d.y, d.s, d.c);
      g.fillStyle = d.c;
      g.beginPath(); g.arc(d.x, d.y, d.s, 0, Math.PI * 2); g.fill();
    }));
    dirty = true;
    twinkle();
  }

  /* ---------- Peker-håndtering (flere fingre) ---------- */
  const pos = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    cancelConfirm();
    const p = pos(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (tool === "stamp") { stampAt(p.x, p.y); return; }
    if (tool === "glitter") {
      active.set(e.pointerId, { mode: "glitter", x: p.x, y: p.y });
      sparkleAt(p.x, p.y, 10);
      return;
    }
    const st = {
      mode: "brush", pts: [{ x: p.x, y: p.y }], x: p.x, y: p.y, t: performance.now(), sp: 0,
      rainbow: tool === "rainbow", hue0: Math.random() * 360,
      color, light: isLight(color), width: brushWidth(),
    };
    active.set(e.pointerId, st);
    dirty = true;
    renderAll();
    startBrushSound();
  }

  function move(e) {
    const st = active.get(e.pointerId);
    if (!st) return;
    e.preventDefault();
    const p = pos(e);
    if (st.mode === "brush") {
      const now = performance.now();
      const dt = Math.max(4, now - st.t);
      const dist = Math.hypot(p.x - st.x, p.y - st.y);
      if (dist < 1.2) return;
      st.sp = st.sp * .55 + (dist / dt) * .45;
      st.pts.push({ x: p.x, y: p.y });
      st.x = p.x; st.y = p.y; st.t = now;
      renderAll();
      brushLevel(Math.min(1, st.sp / 1.5));
      dirty = true;
    } else {
      const dist = Math.hypot(p.x - st.x, p.y - st.y);
      if (dist > 10) {
        sparkleAt(p.x, p.y, 4);
        st.x = p.x; st.y = p.y;
      }
    }
  }

  function up(e) {
    const st = active.get(e.pointerId);
    if (!st) return;
    active.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    if (st.mode === "brush" && bctx) drawStroke(bctx, st); // færdig streg lægges på basen
    renderAll();
    if ([...active.values()].every(s => s.mode !== "brush")) stopBrushSound();
  }

  // Hvis appen mister fokus midt i en streg (fx en iPad-gestus), afsluttes stregen pænt.
  function releaseAll() {
    active.forEach(st => { if (st.mode === "brush" && bctx) drawStroke(bctx, st); });
    active.clear();
    renderAll();
    stopBrushSound();
  }

  /* ---------- Værktøjslinjen ---------- */
  function updateTools() {
    root.querySelectorAll(".ma-tool").forEach(b => {
      const k = b.dataset.tool;
      if (k === "thin" || k === "thick") {
        b.classList.toggle("on", thick === (k === "thick"));
        const emo = tool === "stamp" ? stamp : tool === "glitter" ? "✨" : "";
        const want = emo ? `<span class="ma-mini">${emo}</span>` : `<i class="ma-dot"></i>`;
        if (b.innerHTML !== want) b.innerHTML = want;
      }
      else if (k === "malebog") b.classList.toggle("on", !!outlineKey);
      else if (k === "stamp") { b.classList.toggle("on", tool === "stamp"); b.textContent = stamp; }
      else b.classList.toggle("on", tool === k);
    });
    root.querySelectorAll(".ma-color").forEach(b => b.classList.toggle("on", b.dataset.c === color));
    root.style.setProperty("--ma-col", color);
    styleCursor();
  }

  /* ---------- Pensel-markør (kun med mus eller pen; fingre har ingen markør) ---------- */
  function styleCursor() {
    const c = q(".ma-cur");
    if (!c) return;
    const emo = tool === "stamp" ? stamp : tool === "glitter" ? "✨" : "";
    c.classList.toggle("emo", !!emo);
    c.textContent = emo;
    const d = emo ? (thick ? 44 : 30) : Math.max(10, brushWidth());
    c.style.width = c.style.height = d + "px";
    c.style.fontSize = emo ? (thick ? "36px" : "22px") : "";
    c.style.background = emo ? "" : tool === "rainbow"
      ? "conic-gradient(#ff5252,#ffd21f,#43c463,#3d8bfd,#a566ff,#ff5252)" : color;
  }
  function hover(e) {
    const c = q(".ma-cur");
    if (!c) return;
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") { c.hidden = true; return; }
    const p = pos(e);
    c.hidden = false;
    c.style.left = p.x + "px"; c.style.top = p.y + "px";
  }
  function hideCursor() { const c = q(".ma-cur"); if (c) c.hidden = true; }

  function chooseColor(c) {
    color = c.c;
    cancelConfirm();
    updateTools();
    Spil.sfx.click();
    Spil.say(c.navn, null, c.key);
  }

  function chooseTool(k) {
    Spil.sfx.click();
    cancelConfirm();
    if (k === "new") return askNew();
    if (k === "gallery") return openGallery();
    if (k === "stamp") return openPicker("stamp");
    if (k === "malebog") return openPicker("malebog");
    if (k === "thin") { thick = false; updateTools(); return; }
    if (k === "thick") { thick = true; updateTools(); return; }
    tool = k;
    updateTools();
    const t = TOOL_TXT[k];
    if (t) Spil.say(t[0], null, t[1]);
  }

  function closePicker() {
    const p = q(".ma-picker");
    p.hidden = true; p.innerHTML = ""; p.onclick = null;
  }

  function openPicker(kind) {
    closePicker();
    closeGallery();
    const p = q(".ma-picker");
    if (kind === "stamp") {
      p.innerHTML = `<div class="ma-sheet"><button class="ma-close" aria-label="Luk">✖</button>
        <div class="ma-sheet-in">${STAMPS.map((s, i) => `<button class="ma-pick" data-i="${i}" aria-label="Stempel">${s}</button>`).join("")}</div></div>`;
      p.querySelectorAll(".ma-pick").forEach(b => b.onclick = () => {
        stamp = STAMPS[+b.dataset.i];
        tool = "stamp";
        updateTools();
        closePicker();
        Spil.sfx.click();
      });
      p.querySelector(".ma-close").onclick = closePicker;
      p.onclick = ev => { if (ev.target === p) closePicker(); };
      p.hidden = false;
      Spil.say("Stempler! Tryk på lærredet!", null, "mal-stempel");
    } else {
      p.innerHTML = `<div class="ma-sheet"><button class="ma-close" aria-label="Luk">✖</button>
        <button class="ma-dice" aria-label="Vælg en tilfældig tegning">🎲<span>Overrask mig</span></button>
        <div class="ma-sheet-in">${OUTLINES.map(o => `<button class="ma-pick" data-k="${o.k}" aria-label="${o.navn}">
          <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${outlineArt(o.k)}</svg></button>`).join("")}</div></div>`;
      p.querySelectorAll(".ma-pick").forEach(b => b.onclick = () => {
        chooseOutline(b.dataset.k);
        closePicker();
      });
      p.querySelector(".ma-dice").onclick = () => {
        const andre = OUTLINES.filter(o => o.k !== outlineKey);
        const valg = andre[Math.floor(Math.random() * andre.length)] || OUTLINES[0];
        chooseOutline(valg.k, true);
        closePicker();
      };
      p.querySelector(".ma-close").onclick = closePicker;
      p.onclick = ev => { if (ev.target === p) closePicker(); };
      p.hidden = false;
      Spil.say("Vælg en tegning, du kan male indeni!", null, "mal-malebog");
    }
  }

  function chooseOutline(k, force) {
    Spil.sfx.click();
    if (outlineKey === k && !force) { // tryk på den samme igen = fjern omridset
      outlineKey = null; outlineImg = null;
      q(".ma-outline").innerHTML = "";
      updateTools();
      return;
    }
    outlineKey = k; outlineImg = null;
    q(".ma-outline").innerHTML = `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${outlineArt(k)}</svg>`;
    try {
      const img = new Image();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none" stroke="#26364a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${outlineArt(k)}</svg>`;
      img.onload = () => { if (outlineKey === k) outlineImg = img; };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } catch (e) {}
    updateTools();
  }

  /* ---------- Ny tegning med bekræftelse ---------- */
  function askNew() {
    if (confirming) return;
    confirming = true;
    q(".ma-confirm").hidden = false;
    Spil.say("Skal vi lave en ny tegning? Tryk på den grønne knap!", null, "mal-ny");
    clearTimeout(confirmTimer);
    confirmTimer = later(hideConfirm, 6500);
  }
  function hideConfirm() {
    confirming = false;
    clearTimeout(confirmTimer);
    const c = q(".ma-confirm");
    if (c) c.hidden = true;
  }
  function cancelConfirm() { if (confirming) hideConfirm(); }

  function clearCanvas() {
    if (ctx) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (bctx) {
      bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, base.width, base.height);
      bctx.restore();
    }
    active.clear();
    dirty = false;
  }

  function wipe(after) {
    const el = q(".ma-wipe");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (wipeAnim) { wipeAnim.cancel(); wipeAnim = null; }
      el.hidden = true;
      el.style.transform = "";
      clearCanvas();
      outlineKey = null; outlineImg = null;
      q(".ma-outline").innerHTML = "";
      updateTools();
      after && after();
    };
    if (!el.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    el.hidden = false;
    el.style.transform = "translateX(-101%)";
    if (wipeAnim) wipeAnim.cancel();
    const a = wipeAnim = el.animate(
      [{ transform: "translateX(-101%)" }, { transform: "translateX(0)" }],
      { duration: 800, easing: "cubic-bezier(.5,0,.4,1)", fill: "forwards" }
    );
    a.onfinish = finish;
    later(finish, 1600);
  }

  function doNew() {
    if (!confirming) return;
    hideConfirm();
    saveDrawing();
    Spil.sfx.pop();
    wipe(() => Spil.say("Tada! En helt ny tegning!", null, "mal-nyt"));
  }

  /* ---------- Galleri ---------- */
  const GKEY = "lk-mal";
  function readGallery() {
    try {
      const a = JSON.parse(localStorage.getItem(GKEY));
      return Array.isArray(a) ? a.filter(x => typeof x === "string" && x.startsWith("data:image")) : [];
    } catch (e) { return []; }
  }
  function writeGallery(list) {
    try { localStorage.setItem(GKEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  function snapshotURL() {
    if (!canvas || !canvas.width) return null;
    try {
      const w = Math.min(640, Math.max(1, Math.round(W)));
      const h = Math.max(1, Math.round(w * H / W));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
      g.drawImage(canvas, 0, 0, w, h);
      if (outlineKey && outlineImg) {
        const s = Math.min(w / 800, h / 600), dw = 800 * s, dh = 600 * s;
        g.drawImage(outlineImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      return c.toDataURL("image/jpeg", .7);
    } catch (e) { return null; }
  }

  function saveDrawing() {
    if (!dirty) return;
    dirty = false;
    const url = snapshotURL();
    if (!url) return;
    let list = readGallery();
    if (list[0] === url) return;
    list.unshift(url);
    if (list.length > 8) list.length = 8;
    let ok = false;
    while (list.length) {
      if (writeGallery(list)) { ok = true; break; }
      list.pop(); // hvis der ikke er plads, gemmes der færre
    }
    if (ok) gallery = list;
  }

  function closeGallery() {
    const g = q(".ma-gal");
    if (!g || g.hidden) return;
    g.hidden = true; g.innerHTML = "";
    closeBig();
  }
  function closeBig() {
    const b = q(".ma-big");
    if (!b || b.hidden) return;
    b.hidden = true; b.innerHTML = "";
  }

  function showBig(i) {
    const url = gallery[i];
    if (!url) return;
    const b = q(".ma-big");
    b.innerHTML = `<img src="${url}" alt="En af dine tegninger"><button class="ma-close" aria-label="Luk">✖</button>`;
    b.hidden = false;
    b.querySelector(".ma-close").onclick = closeBig;
    b.onclick = ev => { if (ev.target === b) closeBig(); };
    Spil.sfx.pop();
    Spil.say("Flot!", null, "mal-flot");
  }

  // liste: kun til dybe links (testbilleder, der ikke gemmes)
  function openGallery(liste) {
    hideConfirm();
    closePicker();
    gallery = liste || readGallery();
    const g = q(".ma-gal");
    g.hidden = false;
    g.innerHTML = `<h2>Mine tegninger</h2><button class="ma-close" aria-label="Luk">✖</button>
      <div class="ma-grid">${gallery.length
        ? gallery.map((d, i) => `<button class="ma-card" data-i="${i}" aria-label="Tegning"><img src="${d}" alt=""></button>`).join("")
        : `<div class="ma-empty">🎨</div>`}</div>`;
    g.querySelector(".ma-close").onclick = closeGallery;
    g.querySelectorAll(".ma-card").forEach(c => c.onclick = () => showBig(+c.dataset.i));
    if (gallery.length) Spil.say("Her er dine tegninger!", null, "mal-galleri");
    else Spil.say("Der er ingen tegninger endnu. Mal en, så gemmer jeg den!", null, "mal-tom");
  }

  /* ---------- Dybe links (kun til test): index.html?spil=mal&dyb=... ---------- */
  // En lille færdig tegning, så pensel, regnbue, glimmer og stempler kan ses med ét klik.
  // Den gemmes ikke i galleriet, så barnets tegninger ikke ændres.
  function demoMaling() {
    if (!bctx) return;
    const pt = ([fx, fy]) => ({ x: W * fx, y: H * fy });
    const streg = (pts, c, rainbow) => drawStroke(bctx, {
      pts: pts.map(pt), width: brushWidth(), color: c, light: false, rainbow, hue0: 20,
    });
    streg([[.1, .22], [.3, .12], [.5, .26], [.72, .16]], "#3d8bfd", false);
    streg([[.12, .5], [.34, .4], [.56, .54], [.82, .44]], null, true);
    const gemt = { color, stamp, tool };
    color = "#ffd21f";
    for (let i = 0; i < 8; i++) sparkleAt(W * (.2 + i * .08), H * (.68 + (i % 2) * .04), 8);
    stamp = "⭐"; stampAt(W * .25, H * .86);
    stamp = "🦋"; stampAt(W * .7, H * .84);
    ({ color, stamp, tool } = gemt);
    renderAll();
    dirty = false;
  }

  function applyDyb(d) {
    if (d === "malebog") return openPicker("malebog");
    if (d === "stempel") return openPicker("stamp");
    if (d.startsWith("tegning-")) { chooseOutline(d.slice(8)); return; }
    if (d === "maling") return demoMaling();
    if (d === "ny") { demoMaling(); return askNew(); }
    if (d === "galleri") return openGallery();
    if (d === "galleri-demo") {
      demoMaling();
      const url = snapshotURL();
      return openGallery(url ? [url, url, url] : []);
    }
  }

  /* ---------- Start ---------- */
  Spil.register({
    id: "mal", navn: "Mal", ikon: "🎨", farve: "#a8e6dc",
    start(r) {
      Spil.preload(["mal-hej", "mal-vaelg", "mal-pensel", "mal-regnbue", "mal-glimmer", "mal-stempel",
        "mal-malebog", "mal-ny", "mal-nyt", "mal-galleri", "mal-tom", "mal-flot", "mal-brun", "mal-sort", "mal-hvid",
        ...COLORS.map(c => c.key)]);
      alive = true; timers = []; dirty = false; confirming = false; active.clear();
      tool = "brush"; color = COLORS[0].c; stamp = STAMPS[0]; thick = true;
      outlineKey = null; outlineImg = null; gallery = readGallery();

      r.innerHTML = `<div class="ma">
        <div class="ma-wrap">
          <canvas class="ma-canvas" aria-label="Tegning"></canvas>
          <div class="ma-outline" aria-hidden="true"></div>
          <div class="ma-cur" hidden></div>
          <div class="ma-confirm" hidden><button class="ma-yes" aria-label="Ja, lav en ny tegning">✓</button></div>
          <div class="ma-wipe" hidden></div>
        </div>
        <div class="ma-rail">
          <div class="ma-colors">${COLORS.map(c => `<button class="ma-color" data-c="${c.c}" style="background:${c.c}" aria-label="${c.navn}"></button>`).join("")}</div>
          <div class="ma-tools">
            <button class="ma-tool" data-tool="brush" aria-label="Pensel">🖌️</button>
            <button class="ma-tool" data-tool="rainbow" aria-label="Regnbue-pensel">🌈</button>
            <button class="ma-tool" data-tool="glitter" aria-label="Glimmer">✨</button>
            <button class="ma-tool" data-tool="stamp" aria-label="Stempel">${stamp}</button>
            <button class="ma-tool" data-tool="malebog" aria-label="Malebog"><svg viewBox="150 120 565 360" aria-hidden="true">${ART.fisk}</svg></button>
            <button class="ma-tool" data-tool="thin" aria-label="Tynd pensel / små stempler"><i class="ma-dot"></i></button>
            <button class="ma-tool" data-tool="thick" aria-label="Tyk pensel / store stempler"><i class="ma-dot"></i></button>
            <button class="ma-tool" data-tool="new" aria-label="Ny tegning">🧽</button>
            <button class="ma-tool" data-tool="gallery" aria-label="Galleri">🖼️</button>
          </div>
        </div>
        <div class="ma-picker" hidden></div>
        <div class="ma-gal" hidden></div>
        <div class="ma-big" hidden></div>
      </div>`;

      root = r.querySelector(".ma");
      wrap = q(".ma-wrap");
      canvas = q(".ma-canvas");
      ctx = canvas.getContext("2d");
      base = null; bctx = null;
      fit();
      requestAnimationFrame(() => { if (alive) fit(); });

      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointermove", hover);
      canvas.addEventListener("pointerdown", hover);
      canvas.addEventListener("pointerleave", hideCursor);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      canvas.addEventListener("contextmenu", ev => ev.preventDefault());
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
      addEventListener("blur", releaseAll);

      root.querySelectorAll(".ma-color").forEach(b => b.onclick = () => chooseColor(COLORS.find(c => c.c === b.dataset.c)));
      root.querySelectorAll(".ma-tool").forEach(b => b.onclick = () => chooseTool(b.dataset.tool));
      q(".ma-yes").onclick = doNew;

      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => fit());
        ro.observe(wrap);
      } else addEventListener("resize", fit);

      updateTools();
      const dyb = Spil.dyb || "";
      if (dyb) later(() => { fit(); applyDyb(dyb); }, 150);
      else later(() => Spil.say("Lad os male! Vælg en farve, og mal med fingeren!", null, ["mal-hej", "mal-vaelg"]), 500);
    },
    stop() {
      saveDrawing(); // den gamle tegning gemmes, når man går hjem
      alive = false;
      timers.forEach(clearTimeout); timers = [];
      try { ro && ro.disconnect(); } catch (e) {}
      ro = null;
      removeEventListener("resize", fit);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      removeEventListener("blur", releaseAll);
      stopBrushSound();
      active.clear();
      hideConfirm();
      closeBig();
    }
  });
})();
