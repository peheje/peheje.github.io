// Spil: Sodavand (Sodavands-maskinen) — to scener i linjeløs Sago Mini-stil (Variant A):
// Scene 1 (Blandebordet): vælg mellem 8 AI-illustrerede flasker/kander på træhylden (med små skilte over til voksne).
//   Tryk på en flaske, så flyver den hen over glasset, vipper og hælder en farvet stråle i (op til 3 lag).
// Scene 2 (Café-bordet): træk den færdige sodavand tæt på katten eller hunden, så drikker de automatisk!
//   Glasset rækker til 2 slurke (nok til begge dyr), og udløser skøre SVG-reaktioner + 5 hemmelige komboer (lk-sodavand).
// Ingen tabe-tilstand: effekterne klinger blidt af igen, og man kan altid blande en ny drink.
(function () {
  const STI = "billeder/sodavand/";
  const GEM_KEY = "lk-sodavand";
  const KOMBO_IDS = ["jojo", "damp", "sursoed", "sovehop", "regnbue"];

  const DRINKS = [
    { id: "sour",    label: "Sur citron",  nameKey: "sv-navn-sur",    ico: "🍋", color: "#ffe135", pose: "sour",   colFx: "sv-col-sour",   motFx: "sv-mot-sour",   key: "sv-sur",    say: "Uuuuh! Den er helt vildt sur!",       tag: "Uuuuh, SUR! 🍋",   sfx: "sour" },
    { id: "sugar",   label: "Sukker-chok", nameKey: "sv-navn-sukker", ico: "🍬", color: "#ff66b5", pose: "happy",  colFx: "sv-col-pink",   motFx: "sv-mot-sugar",  key: "sv-sukker", say: "Wiiii! Jeg kan slet ikke stå stille!", tag: "WIIII! 🍬⚡",      sfx: "sugar" },
    { id: "spicy",   label: "Chili-ild",   nameKey: "sv-navn-chili",  ico: "🌶️", color: "#ff4f38", pose: "sour",   colFx: "sv-col-spicy",  motFx: "sv-mot-spicy",  key: "sv-chili",  say: "Puha! Den er stærk! Vand, vand!",      tag: "PUHA, STÆRK! 🌶️", sfx: "spicy" },
    { id: "cold",    label: "Is-brus",     nameKey: "sv-navn-is",     ico: "❄️", color: "#5cd4ff", pose: "sour",   colFx: "sv-col-cold",   motFx: "sv-mot-cold",   key: "sv-is",     say: "Brrrr! Jeg fryser helt vildt!",        tag: "Brrrr! ❄️",        sfx: "cold" },
    { id: "sleepy",  label: "Sove-kakao",  nameKey: "sv-navn-sove",   ico: "😴", color: "#a58bff", pose: "sleepy", colFx: "sv-col-sleepy", motFx: "sv-mot-sleepy", key: "sv-sove",   say: "Gaaab... jeg bliver helt søvnig!",     tag: "Gaaab... 💤",      sfx: "sleepy" },
    { id: "giant",   label: "Kæmpe-melon", nameKey: "sv-navn-kaempe", ico: "🍉", color: "#52cc62", pose: "happy",  colFx: "sv-col-green",  sizeFx: "sv-giant",     key: "sv-kaempe", say: "Whoa! Jeg er blevet kæmpestor!",       tag: "KÆMPESTOR! 🍉",    sfx: "giant" },
    { id: "tiny",    label: "Blåbær-mini", nameKey: "sv-navn-mini",   ico: "🫐", color: "#4d96ff", pose: "idle",   colFx: "sv-col-blue",   sizeFx: "sv-tiny",      key: "sv-mini",   say: "Hov! Jeg er blevet helt lillebitte!",  tag: "Lillebitte! 🫐",   sfx: "tiny" },
    { id: "bubbles", label: "Boble-te",    nameKey: "sv-navn-bobler", ico: "🧋", color: "#5ce1e6", pose: "drink",  motFx: "sv-mot-float",  key: "sv-bobler",      say: "Bøvs! Jeg svæver med bobler!",         tag: "Bøvs! 🧋🫧",       sfx: "bubbles", bubbles: true }
  ];

  const ALL_KEYS = [
    "sv-hej", "sv-mikser", "sv-cafe", "sv-kat-toerstig", "sv-hund-toerstig", "sv-vand", "sv-alle-kombo",
    "sv-kombo-jojo", "sv-kombo-damp", "sv-kombo-sursoed", "sv-kombo-sovehop", "sv-kombo-regnbue",
    ...DRINKS.map(d => d.key),
    ...DRINKS.map(d => d.nameKey)
  ];

  const MACHINES = [
    { id: "blender", label: "Blender",      ico: "🌀", anim: "sv-m-blend", tag: "Brrrr! Smoothie! 🌀" },
    { id: "shaker",  label: "Shaker",       ico: "✨", anim: "sv-m-shake", tag: "Shaka-shaka! ✨" },
    { id: "presser", label: "Presser",      ico: "💦", anim: "sv-m-press", tag: "Mase-saft! 💦" },
    { id: "brus",    label: "Brus-maskine", ico: "🫧", anim: "sv-m-fizz",  tag: "Pssshhh! Brus! 🫧" }
  ];

  Spil.css("css-sodavand", `
    .sv {
      position: fixed; inset: 0; overflow: hidden;
      color: #4a2e1b; font-family: var(--display, system-ui, sans-serif);
      user-select: none; -webkit-user-select: none;
      background: #fff6e6;
    }

    /* Topbar: venstre hjørne er frit til 🏠 */
    .sv-top {
      position: absolute; top: 0; left: 0; right: 0; z-index: 25;
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 4px 86px;
      pointer-events: none;
    }
    .sv-stars {
      pointer-events: auto;
      display: flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,0.9); border-radius: 999px;
      padding: 8px 14px; box-shadow: 0 4px 12px rgba(74,46,27,0.12);
      font-size: 20px; line-height: 1;
    }
    .sv-star { opacity: 0.24; transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s; }
    .sv-star.on { opacity: 1; transform: scale(1.14); }

    .sv-pill {
      pointer-events: auto; border: none; border-radius: 999px;
      background: rgba(255,255,255,0.94); color: #4a2e1b;
      min-width: 56px; min-height: 50px; padding: 0 16px;
      font-family: inherit; font-weight: 800; font-size: 17px;
      display: flex; align-items: center; gap: 6px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(74,46,27,0.14);
      transition: transform 0.12s;
    }
    .sv-pill:active { transform: scale(0.93); }
    .sv-pill[hidden] { display: none; }

    /* ==================== 2 SCENER ==================== */
    .sv-view {
      position: absolute; inset: 0;
      transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .sv-view.out-left  { opacity: 0; pointer-events: none; transform: translateX(-6%); }
    .sv-view.out-right { opacity: 0; pointer-events: none; transform: translateX(6%); }

    /* ---------- SCENE 1: BLANDEBORDET (TRÆHYLDE MED 8 FLASKER) ---------- */
    .sv-lab {
      background: url("${STI}bg-vaerksted.webp?v=4k") center bottom / cover no-repeat;
      display: flex; flex-direction: column; justify-content: flex-end;
    }

    .sv-shelves {
      position: absolute; left: 0; right: 0; bottom: 58.8%; z-index: 6;
      display: flex; flex-direction: column; align-items: center; gap: 18px;
      padding: 0 16px;
    }
    .sv-shelf {
      position: relative;
      display: flex; align-items: flex-end; justify-content: center;
      gap: clamp(6px, 1.6vw, 20px);
      padding: 0 18px 0;
      max-width: 900px; width: 78%;
    }
    /* På iPad/desktop står flaskerne direkte på selve baggrundens tegnede træhylde */
    .sv-shelf::after { display: none; }

    .sv-bottle {
      position: relative; z-index: 2;
      background: none; border: none; padding: 0; cursor: pointer;
      width: clamp(72px, 9.6vw, 112px);
      display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px;
      transform-origin: center bottom;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      touch-action: manipulation;
    }
    .sv-bottle:hover { transform: translateY(-6px) scale(1.06); }
    .sv-bottle:active { transform: scale(0.92); }
    .sv-label {
      background: rgba(255, 250, 238, 0.94);
      color: #5c3a21;
      border: 1.5px solid rgba(196, 146, 92, 0.45);
      border-radius: 9px;
      padding: 3px 7px;
      font-size: clamp(10px, 1.05vw, 13px);
      font-weight: 800; line-height: 1.15;
      white-space: nowrap;
      box-shadow: 0 3px 7px rgba(90, 52, 22, 0.14);
      pointer-events: none;
    }
    .sv-bottle img {
      width: 100%; height: clamp(92px, 13vw, 148px);
      object-fit: contain; object-position: center bottom;
      pointer-events: none;
      filter: drop-shadow(0 6px 8px rgba(90, 52, 22, 0.22));
    }
    .sv-bottle.pouring-src { opacity: 0.2; transform: scale(0.9); pointer-events: none; }

    /* Flyvende hælde-flaske + farvet stråle */
    .sv-pourer {
      position: absolute; z-index: 18; width: 96px; height: 130px;
      pointer-events: none;
      transition: left 0.34s cubic-bezier(0.34,1.2,0.64,1), top 0.34s cubic-bezier(0.34,1.2,0.64,1), transform 0.34s cubic-bezier(0.34,1.2,0.64,1);
    }
    .sv-pourer img {
      width: 100%; height: 100%; object-fit: contain;
      filter: drop-shadow(0 10px 14px rgba(74,46,27,0.22));
    }

    .sv-stream {
      position: absolute; z-index: 11; width: 14px; border-radius: 999px;
      pointer-events: none; opacity: 0;
      transform-origin: top center;
      transition: opacity 0.14s ease;
    }
    .sv-stream.on { opacity: 0.92; animation: sv-stream-wiggle 0.16s ease-in-out infinite alternate; }
    @keyframes sv-stream-wiggle {
      0%   { transform: translateX(-50%) scaleX(0.86); }
      100% { transform: translateX(-50%) scaleX(1.16); }
    }

    /* Bord-zone i bunden af Scene 1: Skyl + Stort glas + Servér-knap */
    .sv-counter {
      position: relative; z-index: 10;
      display: flex; align-items: flex-end; justify-content: center;
      gap: clamp(18px, 6vw, 72px);
      padding-bottom: max(26px, calc(env(safe-area-inset-bottom) + 18px));
      min-height: 220px;
    }

    .sv-lab-cup {
      position: relative; width: clamp(118px, 16vw, 152px); height: clamp(156px, 21vw, 200px);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .sv-lab-cup.bump { transform: scale(1.09, 0.94); }
    .sv-lab-cup svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 10px 16px rgba(74,46,27,0.2)); }

    .sv-rinse {
      border: none; border-radius: 50%;
      width: 66px; height: 66px; margin-bottom: 18px;
      background: rgba(255,255,255,0.92);
      font-size: 30px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 16px rgba(74,46,27,0.16);
      transition: transform 0.2s, opacity 0.25s;
    }
    .sv-rinse.hide { opacity: 0; pointer-events: none; transform: scale(0.6); }
    .sv-rinse:active { transform: scale(0.9); }

    /* Stor "Servér!" knap med mini-ikoner af Kat & Hund + pil (ingen tekst!) */
    .sv-serve {
      border: 4px solid #ffffff; border-radius: 999px;
      min-width: 118px; height: 82px; padding: 0 22px; margin-bottom: 14px;
      background: linear-gradient(135deg, #6ee07c, #3ec45d);
      color: #ffffff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 8px 22px rgba(45, 145, 68, 0.34);
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s;
      animation: sv-serve-pulse 1.2s ease-in-out infinite;
    }
    .sv-serve.hide { opacity: 0; pointer-events: none; transform: scale(0.5); animation: none; }
    .sv-serve:active { transform: scale(0.92); }
    .sv-serve img { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18)); }
    .sv-serve .arr { font-size: 32px; font-weight: 900; line-height: 1; }
    @keyframes sv-serve-pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.07); }
    }

    /* ---------- SCENE 2: MIKSER-BORDET (4 KØKKENMASKINER) ---------- */
    .sv-mixer {
      background: url("${STI}bg-vaerksted.webp?v=4k") center bottom / cover no-repeat;
      display: flex; flex-direction: column; justify-content: flex-end;
    }
    .sv-machines {
      position: absolute; left: 0; right: 0; bottom: 58.8%; z-index: 6;
      display: flex; align-items: flex-end; justify-content: center;
      gap: clamp(14px, 3.6vw, 48px);
      padding: 0 24px;
    }
    .sv-machine {
      position: relative; z-index: 2;
      background: none; border: none; padding: 0; cursor: pointer;
      width: clamp(112px, 15vw, 192px);
      display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 7px;
      transform-origin: center bottom;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      touch-action: manipulation;
    }
    .sv-machine:hover { transform: translateY(-6px) scale(1.05); }
    .sv-machine:active { transform: scale(0.93); }
    .sv-machine img {
      width: 100%; height: clamp(112px, 15vw, 188px);
      object-fit: contain; object-position: center bottom;
      pointer-events: none;
      filter: drop-shadow(0 8px 10px rgba(90, 52, 22, 0.22));
    }
    .sv-machine.picked .sv-label {
      background: #fff3b0; border-color: #f4a261;
    }
    .sv-machine.sv-m-blend img { animation: sv-m-blend 0.11s linear infinite; }
    .sv-machine.sv-m-shake img { animation: sv-m-shake 0.24s ease-in-out infinite; }
    .sv-machine.sv-m-press img { animation: sv-m-press 0.42s ease-in-out 2; }
    .sv-machine.sv-m-fizz  img { animation: sv-m-fizz  0.32s ease-in-out 3; }

    @keyframes sv-m-blend {
      0%   { transform: translate(-3px, 0) rotate(-2deg); }
      50%  { transform: translate(3px, -2px) rotate(2deg); }
      100% { transform: translate(-2px, 1px) rotate(-1.5deg); }
    }
    @keyframes sv-m-shake {
      0%, 100% { transform: translateY(0) rotate(-10deg); }
      50%      { transform: translateY(-28px) rotate(12deg); }
    }
    @keyframes sv-m-press {
      0%, 100% { transform: scale(1, 1); }
      45%      { transform: scale(1.18, 0.72); }
    }
    @keyframes sv-m-fizz {
      0%, 100% { transform: scale(1, 1) translateY(0); }
      40%      { transform: scale(1.06, 0.92) translateY(5px); }
    }

    .sv-mix-cup {
      position: relative; width: clamp(122px, 16.5vw, 156px); height: clamp(160px, 21.5vw, 206px);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .sv-mix-cup svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 10px 16px rgba(74,46,27,0.2)); }
    .sv-mix-cup.sv-cup-blend { animation: sv-m-blend 0.1s linear 9; }
    .sv-mix-cup.sv-cup-shake { animation: sv-m-shake 0.22s ease-in-out 4; }
    .sv-mix-cup.sv-cup-press { animation: sv-m-press 0.42s ease-in-out 2; }
    .sv-mix-cup.sv-cup-fizz  { animation: sv-m-fizz  0.26s ease-in-out 4; }

    .sv-mix-tag {
      position: absolute; top: -40px; left: 50%; transform: translateX(-50%) scale(0);
      background: #fff; color: #4a2e1b; padding: 6px 14px; border-radius: 999px;
      font-weight: 800; font-size: 16px; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(74,46,27,0.16); pointer-events: none; z-index: 15;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    .sv-mix-tag.show { transform: translateX(-50%) scale(1); }

    /* ---------- INTERAKTIV MASKINE-STATION (OVERLAY I MIKSER-SCENEN) ---------- */
    .sv-station {
      position: absolute; inset: 0; z-index: 19;
      background: rgba(255, 246, 230, 0.84);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
      padding: max(68px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
      opacity: 0; pointer-events: none;
      transition: opacity 0.28s ease;
    }
    .sv-station.open { opacity: 1; pointer-events: auto; }
    .sv-st-close {
      position: absolute; top: max(76px, calc(env(safe-area-inset-top) + 64px)); right: max(16px, env(safe-area-inset-right));
      border: none; border-radius: 50%; width: 54px; height: 54px;
      background: rgba(255,255,255,0.95); color: #4a2e1b; font-size: 24px; font-weight: 900;
      cursor: pointer; box-shadow: 0 4px 12px rgba(74,46,27,0.15);
    }
    .sv-st-close:active { transform: scale(0.92); }
    .sv-st-hint {
      background: #fff; color: #4a2e1b; padding: 8px 18px; border-radius: 999px;
      font-weight: 900; font-size: clamp(16px, 2.2vw, 21px);
      box-shadow: 0 6px 16px rgba(74,46,27,0.12);
      text-align: center;
    }
    .sv-st-meter {
      width: min(320px, 76vw); height: 22px; border-radius: 999px;
      background: rgba(255,255,255,0.9); border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(74,46,27,0.14); overflow: hidden;
    }
    .sv-st-fill {
      width: 0%; height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, #ff6b8b, #ffd93d, #6bcb77);
      transition: width 0.16s ease-out;
    }
    .sv-st-stage {
      position: relative; width: min(580px, 94vw); height: min(360px, 52vh);
      display: flex; align-items: flex-end; justify-content: center;
    }
    /* Glasset inde i stationen (flyver op og hælder i maskinen, bliver tomt, og fyldes igen!) */
    .sv-st-cup {
      position: absolute; left: 10%; bottom: 18px; width: 104px; height: 136px; z-index: 10;
      transition: left 0.45s cubic-bezier(0.34,1.2,0.64,1), bottom 0.45s cubic-bezier(0.34,1.2,0.64,1), transform 0.45s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s;
      pointer-events: none;
    }
    .sv-st-cup svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 14px rgba(74,46,27,0.2)); }
    .sv-st-stream {
      position: absolute; width: 15px; border-radius: 999px; z-index: 9;
      pointer-events: none; opacity: 0; transform-origin: top center;
      transition: opacity 0.14s ease;
    }
    .sv-st-stream.on { opacity: 0.94; animation: sv-stream-wiggle 0.15s ease-in-out infinite alternate; }

    /* Den store interaktive maskine i midten af stationen */
    .sv-st-unit {
      position: relative; width: min(270px, 60vw); height: min(320px, 46vh);
      display: flex; align-items: flex-end; justify-content: center;
      touch-action: none; cursor: pointer; z-index: 6;
      transition: transform 0.35s cubic-bezier(0.34,1.3,0.64,1);
    }
    .sv-st-unit.dragging { transition: none; cursor: grabbing; }
    .sv-st-unit.tilting { transform: translateX(-44px) rotate(-52deg); }
    .sv-st-art {
      position: relative; height: 100%; aspect-ratio: var(--ar, 0.7);
      max-width: 100%;
    }
    .sv-st-art img {
      position: relative; z-index: 3; width: 100%; height: 100%; object-fit: contain; pointer-events: none;
      filter: drop-shadow(0 12px 18px rgba(74,46,27,0.2));
    }
    /* Væske-overlay i barnets egne farver (blender-kande, shaker, presser-skål) */
    .sv-st-liq {
      position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 4; pointer-events: none; overflow: visible;
    }
    .sv-st-unit.blending .sv-st-art { animation: sv-m-blend 0.09s linear infinite; }
    .sv-st-unit.shaking  .sv-st-art { animation: sv-m-shake 0.22s ease-in-out; }
    .sv-st-unit.pressing .sv-st-art { animation: sv-m-press 0.36s ease-in-out; }
    .sv-st-unit.fizzing  .sv-st-art { animation: sv-m-fizz  0.28s ease-in-out; }

    /* Hvirvlende blend-animation inde i blender-kanden */
    .sv-swirl-g { transform-origin: 50% 42%; }
    .sv-st-unit.blending .sv-swirl-g { animation: sv-swirl-spin 0.42s linear infinite; }
    @keyframes sv-swirl-spin {
      0%   { transform: rotate(0deg) scale(1); }
      50%  { transform: rotate(180deg) scale(1.06, 0.94); }
      100% { transform: rotate(360deg) scale(1); }
    }

    /* Pulserende interaktions-hotspot (fx rød blender-knap, gul brus-knap, presser-håndtag) */
    .sv-hotspot {
      position: absolute; z-index: 8; border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.95);
      background: rgba(255, 230, 100, 0.28);
      box-shadow: 0 0 0 6px rgba(255, 190, 60, 0.32);
      pointer-events: none;
      animation: sv-hot-pulse 1.05s ease-in-out infinite;
    }
    .sv-hotspot.hide { opacity: 0; animation: none; }
    @keyframes sv-hot-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.95; }
      50%      { transform: translate(-50%, -50%) scale(1.16); opacity: 0.65; }
    }

    /* Brus-bobler der fiser op inde i glasset under brus-maskinen */
    .sv-fizz-jet {
      position: absolute; left: 38.5%; top: 47%; width: 10px; height: 28%;
      transform: translateX(-50%); border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(180,240,255,0.2));
      z-index: 6; opacity: 0; pointer-events: none; transition: opacity 0.1s;
    }
    .sv-st-unit.fizzing .sv-fizz-jet { opacity: 1; }
    .sv-st-art { transform-origin: center bottom; transition: transform 0.14s ease-out; }

    /* ---------- SCENE 3: CAFÉ-BORDET (KAT & HUND) ---------- */
    .sv-cafe {
      background: url("${STI}bg-cafe.webp?v=4k") center bottom / cover no-repeat;
      display: flex; flex-direction: column; justify-content: flex-end;
    }

    .sv-banner {
      position: absolute; top: max(68px, calc(env(safe-area-inset-top) + 58px)); left: 50%;
      transform: translateX(-50%) scale(0); z-index: 22;
      background: linear-gradient(135deg, #fff5b8, #ffd6ec);
      border: 3px solid #fff; border-radius: 999px;
      padding: 8px 18px; font-weight: 900; font-size: 17px; white-space: nowrap;
      box-shadow: 0 8px 22px rgba(74,46,27,0.18); pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .sv-banner.show { transform: translateX(-50%) scale(1); }

    .sv-row {
      position: relative; z-index: 6;
      display: flex; align-items: flex-end; justify-content: center;
      gap: clamp(32px, 11vw, 190px);
      padding-bottom: max(76px, calc(env(safe-area-inset-bottom) + 64px));
      flex: 1;
    }

    .sv-pet {
      position: relative;
      width: clamp(210px, 33vw, 370px); height: clamp(210px, 33vw, 370px);
      max-width: 46vh; max-height: 46vh;
      display: flex; align-items: flex-end; justify-content: center;
      cursor: pointer; touch-action: manipulation;
      transition: transform 1.35s cubic-bezier(0.25, 1.25, 0.45, 1);
      transform-origin: center bottom;
    }
    .sv-pet.drop-over { transform: scale(1.08); }
    .sv-shadow {
      position: absolute; bottom: -4px; left: 50%; width: 66%; height: 22px;
      transform: translateX(-50%);
      background: radial-gradient(ellipse at center, rgba(95,58,28,0.26) 0%, transparent 72%);
      transition: transform 0.5s, opacity 0.5s; pointer-events: none;
    }
    .sv-pet.sv-mot-float .sv-shadow { transform: translateX(-50%) scale(0.5); opacity: 0.3; }

    .sv-motion {
      position: relative; width: 100%; height: 100%;
      display: flex; align-items: flex-end; justify-content: center;
      transform-origin: center bottom;
      animation: sv-breathe 3.2s ease-in-out infinite;
    }
    .sv-pet[data-pet="hund"] .sv-motion { animation-delay: -1.4s; }
    .sv-pet.eager .sv-motion { animation: sv-eager 0.85s ease-in-out infinite; }

    .sv-img {
      width: 100%; height: 100%; object-fit: contain; pointer-events: none;
      transition: filter 0.45s ease;
      filter: drop-shadow(0 6px 10px rgba(74,46,27,0.14));
    }

    .sv-tag {
      position: absolute; top: -18px; left: 50%; transform: translateX(-50%) scale(0);
      background: #fff; color: #4a2e1b; padding: 6px 14px; border-radius: 999px;
      font-weight: 800; font-size: 16px; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(74,46,27,0.16); pointer-events: none; z-index: 15;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), top 0.3s;
    }
    .sv-tag.show { transform: translateX(-50%) scale(1); }
    .sv-pet.sv-mot-float .sv-tag { top: -88px; }

    /* Akser */
    .sv-pet.sv-giant { transform: scale(1.48); z-index: 9; }
    .sv-pet.sv-tiny  { transform: scale(0.50); }
    .sv-pet.sv-yoyo  { animation: sv-yoyo 2.6s ease-in-out infinite; z-index: 9; }

    .sv-pet.drinking .sv-motion       { animation: sv-gulp 0.33s ease-in-out infinite !important; }
    .sv-pet.sv-mot-sour .sv-motion    { animation: sv-sour 0.52s ease-in-out infinite !important; }
    .sv-pet.sv-mot-sugar .sv-motion   { animation: sv-sugar 0.6s cubic-bezier(0.36,0.07,0.19,0.97) infinite !important; }
    .sv-pet.sv-mot-spicy .sv-motion   { animation: sv-spicy 0.38s ease-in-out infinite !important; }
    .sv-pet.sv-mot-cold .sv-motion    { animation: sv-cold 0.16s linear infinite !important; }
    .sv-pet.sv-mot-sleepy .sv-motion  { animation: sv-sleepy 3.2s ease-in-out infinite !important; }
    .sv-pet.sv-mot-float .sv-motion   { animation: sv-float 2.2s ease-in-out infinite !important; }
    .sv-pet.sv-mot-sovehop .sv-motion { animation: sv-sovehop 1.1s ease-in-out infinite !important; }

    .sv-pet.sv-col-sour .sv-img   { filter: saturate(1.3) hue-rotate(16deg) drop-shadow(0 6px 10px rgba(74,46,27,0.14)); }
    .sv-pet.sv-col-pink .sv-img   { filter: hue-rotate(310deg) saturate(1.5) drop-shadow(0 6px 10px rgba(180,40,100,0.2)); }
    .sv-pet.sv-col-spicy .sv-img  { filter: saturate(2.1) hue-rotate(-14deg) drop-shadow(0 0 18px rgba(255,70,30,0.55)); }
    .sv-pet.sv-col-cold .sv-img   { filter: hue-rotate(165deg) saturate(1.35) brightness(1.08) drop-shadow(0 0 16px rgba(90,200,255,0.55)); }
    .sv-pet.sv-col-blue .sv-img   { filter: hue-rotate(195deg) saturate(1.5) drop-shadow(0 6px 10px rgba(40,80,180,0.22)); }
    .sv-pet.sv-col-green .sv-img  { filter: hue-rotate(85deg) saturate(1.3) drop-shadow(0 6px 10px rgba(40,140,60,0.2)); }
    .sv-pet.sv-col-sleepy .sv-img { filter: hue-rotate(245deg) saturate(0.85) brightness(1.02) drop-shadow(0 6px 10px rgba(100,70,150,0.2)); }
    .sv-pet.sv-rainbow .sv-img    { animation: sv-rainbow 1.5s linear infinite; }

    @keyframes sv-breathe { 0%,100% { transform: scale(1,1) translateY(0); } 50% { transform: scale(1.025,0.975) translateY(2px); } }
    @keyframes sv-eager   { 0%,100% { transform: translateY(0) scale(1,1); } 40% { transform: translateY(-10px) scale(0.96,1.05); } 65% { transform: translateY(0) scale(1.05,0.95); } }
    @keyframes sv-gulp    { 0%,100% { transform: scale(1,1) rotate(0); } 45% { transform: scale(1.08,0.91) rotate(-3deg); } 75% { transform: scale(0.95,1.07) rotate(2deg); } }
    @keyframes sv-sour    { 0%,100% { transform: scale(1.12,0.84) rotate(-5deg) translateX(-4px); } 50% { transform: scale(0.93,1.04) rotate(6deg) translateX(5px); } }
    @keyframes sv-sugar   {
      0%,100% { transform: translate(0,0) rotate(0) scale(1,1); }
      20% { transform: translate(-24px,-36px) rotate(-14deg) scale(0.92,1.12); }
      40% { transform: translate(0,0) rotate(0) scale(1.12,0.88); }
      62% { transform: translate(26px,-42px) rotate(15deg) scale(0.92,1.12); }
      82% { transform: translate(0,0) rotate(-6deg) scale(1.1,0.9); }
    }
    @keyframes sv-spicy   { 0%,100% { transform: translateY(0) scale(1.06,0.92); } 50% { transform: translateY(-28px) scale(0.94,1.08); } }
    @keyframes sv-cold    { 0%,100% { transform: translateX(-4px) rotate(-2deg); } 50% { transform: translateX(4px) rotate(2deg); } }
    @keyframes sv-sleepy  { 0%,100% { transform: rotate(-6deg) scale(1.02,0.98); } 50% { transform: rotate(6deg) scale(0.99,1.01); } }
    @keyframes sv-sovehop { 0%,100% { transform: translateY(0) rotate(-6deg); } 45% { transform: translateY(-18px) rotate(6deg); } }
    @keyframes sv-float   { 0%,100% { transform: translateY(-54px) rotate(-5deg); } 50% { transform: translateY(-86px) rotate(6deg); } }
    @keyframes sv-yoyo    { 0%,100% { transform: scale(1.42); } 50% { transform: scale(0.55); } }
    @keyframes sv-rainbow {
      0%   { filter: hue-rotate(0deg) saturate(1.7) drop-shadow(0 8px 14px rgba(255,100,180,0.35)); }
      100% { filter: hue-rotate(360deg) saturate(1.7) drop-shadow(0 8px 14px rgba(100,200,255,0.35)); }
    }

    /* Serverings-glasset på cafébordet — stort og let at trække hen til dyrene */
    .sv-cup {
      position: absolute; left: 50%; bottom: max(34px, calc(env(safe-area-inset-bottom) + 24px));
      transform: translateX(-50%);
      z-index: 12; width: clamp(108px, 10vw, 134px); height: clamp(140px, 13vw, 174px); cursor: grab; touch-action: none;
      transition: left 0.42s cubic-bezier(0.34,1.3,0.64,1), bottom 0.42s cubic-bezier(0.34,1.3,0.64,1), transform 0.42s cubic-bezier(0.34,1.3,0.64,1), opacity 0.3s;
    }
    .sv-cup.ready { animation: sv-cup-beckon 1.9s ease-in-out infinite; }
    .sv-cup.nudge { animation: sv-cup-nudge 0.48s ease-in-out !important; }
    .sv-cup.dragging { transition: none; animation: none !important; cursor: grabbing; z-index: 18; }
    .sv-cup.empty { opacity: 0; pointer-events: none; animation: none !important; transform: translateX(-50%) scale(0.7); }
    .sv-cup svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 14px rgba(74,46,27,0.22)); }
    @keyframes sv-cup-beckon {
      0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
      45%      { transform: translateX(-50%) translateY(-8px) rotate(-3deg); }
      70%      { transform: translateX(-50%) translateY(-4px) rotate(3deg); }
    }
    @keyframes sv-cup-nudge {
      0%, 100% { transform: translateX(-50%) scale(1); }
      35%      { transform: translateX(-50%) translateY(-18px) scale(1.14) rotate(-6deg); }
      70%      { transform: translateX(-50%) translateY(-10px) scale(1.1) rotate(6deg); }
    }

    /* Stor "Bland ny drink!"-knap på bordet når glasset er tomt */
    .sv-new-drink {
      position: absolute; left: 50%; bottom: max(32px, calc(env(safe-area-inset-bottom) + 22px));
      transform: translateX(-50%) scale(0); z-index: 15;
      border: 4px solid #ffffff; border-radius: 999px;
      height: 76px; padding: 0 24px;
      background: linear-gradient(135deg, #ffd95e, #ff9f43);
      color: #4a2e1b; font-family: inherit; font-weight: 900; font-size: 20px;
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      box-shadow: 0 8px 22px rgba(175, 95, 25, 0.3);
      opacity: 0; pointer-events: none;
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s;
    }
    .sv-new-drink.show {
      opacity: 1; pointer-events: auto;
      transform: translateX(-50%) scale(1);
      animation: sv-new-pulse 1.4s ease-in-out 0.4s infinite;
    }
    .sv-new-drink:active { transform: translateX(-50%) scale(0.93); }
    @keyframes sv-new-pulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50%      { transform: translateX(-50%) scale(1.06); }
    }

    /* ==================== TEGNEDE SVG-REAKTIONER ==================== */
    .sv-fx { position: absolute; inset: 0; pointer-events: none; z-index: 14; overflow: hidden; }
    .sv-riser { position: absolute; font-size: 26px; pointer-events: none; animation: sv-rise 2.4s ease-out forwards; }
    @keyframes sv-rise {
      0%   { transform: translate(-50%, 0) scale(0.5); opacity: 0.95; }
      100% { transform: translate(calc(-50% + var(--dx)), -140px) scale(1.3); opacity: 0; }
    }
    .sv-bubble {
      position: absolute; width: 54px; height: 54px; border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, var(--bcol, rgba(160,235,255,0.5)) 55%, rgba(255,180,240,0.45) 100%);
      border: 2px solid rgba(255,255,255,0.88);
      box-shadow: inset -4px -4px 10px rgba(120,200,255,0.35), 0 4px 10px rgba(0,0,0,0.08);
      pointer-events: auto; cursor: pointer;
      animation: sv-bub 4.2s ease-in forwards;
    }
    @keyframes sv-bub {
      0%   { transform: translate(-50%,0) scale(0.35); opacity: 0.9; }
      15%  { transform: translate(calc(-50% + var(--sway)),-40px) scale(1); opacity: 1; }
      100% { transform: translate(calc(-50% - var(--sway)),-360px) scale(1.1); opacity: 0; }
    }

    .sv-flame {
      position: absolute; left: 50%; top: 44%; width: 78%; height: 78%;
      transform: translate(-50%, -82%) scale(0); transform-origin: 50% 92%;
      pointer-events: none; z-index: 13;
      animation: sv-flame-pop 1.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .sv-flame svg {
      width: 100%; height: 100%; overflow: visible;
      filter: drop-shadow(0 0 18px rgba(255, 110, 40, 0.55));
      animation: sv-flame-flicker 0.14s ease-in-out infinite alternate;
      transform-origin: 50% 92%;
    }
    @keyframes sv-flame-pop {
      0%   { transform: translate(-50%, -82%) scale(0.15, 0.1); opacity: 0; }
      14%  { transform: translate(-50%, -86%) scale(1.18, 1.24); opacity: 1; }
      35%  { transform: translate(-50%, -88%) scale(1.06, 1.15); opacity: 1; }
      78%  { transform: translate(-50%, -90%) scale(1.0, 1.05); opacity: 0.95; }
      100% { transform: translate(-50%, -96%) scale(0.45, 0.25); opacity: 0; }
    }
    @keyframes sv-flame-flicker { 0% { transform: scale(0.95,1.04) rotate(-3deg); } 100% { transform: scale(1.06,0.96) rotate(3deg); } }

    .sv-steam {
      position: absolute; width: 64px; height: 46px; pointer-events: none; z-index: 13;
      opacity: 0; filter: drop-shadow(0 4px 8px rgba(120, 95, 75, 0.28));
    }
    .sv-steam.left  { left: 10%; top: 26%; animation: sv-steam-l 1.15s ease-out forwards; }
    .sv-steam.right { right: 10%; top: 26%; animation: sv-steam-r 1.15s ease-out forwards; }
    @keyframes sv-steam-l { 0% { transform: translate(12px,0) scale(0.35); opacity: 0.95; } 55% { opacity: 0.9; } 100% { transform: translate(-76px,-46px) scale(1.35) rotate(-14deg); opacity: 0; } }
    @keyframes sv-steam-r { 0% { transform: translate(-12px,0) scale(0.35); opacity: 0.95; } 55% { opacity: 0.9; } 100% { transform: translate(76px,-46px) scale(1.35) rotate(14deg); opacity: 0; } }

    .sv-sweat { position: absolute; left: 74%; top: 34%; width: 22px; height: 28px; pointer-events: none; z-index: 13; animation: sv-sweat-drop 0.85s ease-in forwards; }
    @keyframes sv-sweat-drop { 0% { transform: translate(0,0) scale(0.4); opacity: 0.95; } 35% { transform: translate(14px,-14px) scale(1.05) rotate(18deg); opacity: 1; } 100% { transform: translate(26px,28px) scale(0.85) rotate(32deg); opacity: 0; } }

    .sv-icecube {
      position: absolute; left: 50%; bottom: -6px; width: 108%; height: 106%;
      transform: translateX(-50%) scale(0.2); transform-origin: center bottom;
      pointer-events: auto; cursor: pointer; z-index: 13;
      animation: sv-ice-freeze 0.45s cubic-bezier(0.22, 1.25, 0.36, 1) forwards;
    }
    .sv-icecube svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 18px rgba(70,185,245,0.38)); }
    .sv-icecube.melt { animation: sv-ice-melt 0.45s ease-in forwards !important; pointer-events: none; }
    @keyframes sv-ice-freeze { 0% { transform: translateX(-50%) scale(0.25,0.15); opacity: 0; } 65% { transform: translateX(-50%) scale(1.05,1.04); opacity: 1; } 100% { transform: translateX(-50%) scale(1,1); opacity: 1; } }
    @keyframes sv-ice-melt   { 0% { transform: translateX(-50%) scale(1,1); opacity: 1; } 100% { transform: translateX(-50%) scale(1.18,0.25); opacity: 0; } }

    .sv-moon {
      position: absolute; right: -6%; top: -18%; width: 74px; height: 74px;
      pointer-events: none; z-index: 13;
      animation: sv-moon-in 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, sv-moon-bob 3.4s ease-in-out 0.6s infinite;
    }
    .sv-moon svg { width: 100%; height: 100%; filter: drop-shadow(0 0 12px rgba(255,220,110,0.65)); }
    @keyframes sv-moon-in  { 0% { transform: scale(0) rotate(-25deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
    @keyframes sv-moon-bob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-9px) rotate(5deg); } }
    .sv-svg-riser { position: absolute; pointer-events: none; z-index: 14; animation: sv-rise 2.4s ease-out forwards; }

    .sv-zigs { position: absolute; inset: -10% -14% 25% -14%; pointer-events: none; z-index: 13; animation: sv-zigs-vib 0.18s linear infinite alternate; }
    .sv-zigs svg { width: 100%; height: 100%; overflow: visible; }
    @keyframes sv-zigs-vib { 0% { transform: translate(-2px,-1px) scale(0.98); } 100% { transform: translate(2px,1px) scale(1.03); } }

    .sv-fly { position: absolute; pointer-events: none; z-index: 14; animation: sv-fly-out 0.95s cubic-bezier(0.2,0.85,0.3,1) forwards; }
    @keyframes sv-fly-out { 0% { transform: translate(-50%,-50%) scale(0.35) rotate(0); opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.15) rotate(var(--rot)); opacity: 0; } }

    .sv-dust { position: absolute; bottom: -2px; width: 68px; height: 44px; pointer-events: none; z-index: 13; }
    .sv-dust.left  { left: 6%;  animation: sv-dust-l 0.85s ease-out forwards; }
    .sv-dust.right { right: 6%; animation: sv-dust-r 0.85s ease-out forwards; }
    @keyframes sv-dust-l { 0% { transform: translate(10px,0) scale(0.35); opacity: 0.95; } 100% { transform: translate(-74px,-18px) scale(1.3); opacity: 0; } }
    @keyframes sv-dust-r { 0% { transform: translate(-10px,0) scale(0.35); opacity: 0.95; } 100% { transform: translate(74px,-18px) scale(1.3); opacity: 0; } }

    /* Telefon på højkant: 2 hylder med 4 flasker på hver, frit for 🏠-knappen */
    @media (max-width: 720px) {
      .sv-top { padding-left: 72px; gap: 6px; }
      .sv-stars { font-size: 15px; padding: 6px 10px; }
      .sv-pill { min-height: 44px; padding: 0 12px; font-size: 14px; }
      .sv-lab, .sv-mixer {
        justify-content: space-between;
        background:
          linear-gradient(180deg, transparent 74%, #d99f62 74%, #c98f52 100%),
          repeating-linear-gradient(90deg, #fff5e2 0 28px, #fce6c5 28px 56px);
      }
      .sv-shelves {
        position: relative; bottom: auto;
        margin-top: max(92px, calc(env(safe-area-inset-top) + 82px)); gap: 16px;
      }
      .sv-machines {
        position: relative; bottom: auto;
        margin-top: max(98px, calc(env(safe-area-inset-top) + 86px));
        display: grid; grid-template-columns: repeat(2, 1fr);
        justify-items: center; gap: 18px 12px; padding: 0 18px;
      }
      .sv-machine { width: 38vw; max-width: 150px; }
      .sv-machine img { height: 28vw; max-height: 112px; }
      .sv-shelf { gap: 8px; padding: 0 10px 14px; width: 100%; }
      .sv-shelf::after {
        display: block; content: ""; position: absolute; left: 4%; right: 4%; bottom: 0; height: 16px;
        background: linear-gradient(180deg, #e7b57c 0%, #d49a5d 70%, #b87e42 100%);
        border-radius: 9px;
        box-shadow: 0 5px 12px rgba(105,65,28,0.22), inset 0 3px 0 rgba(255,255,255,0.3);
        z-index: 1;
      }
      .sv-bottle { width: 21vw; max-width: 84px; gap: 4px; }
      .sv-bottle img { height: 22vw; max-height: 92px; }
      .sv-label { font-size: 10px; padding: 2px 5px; }
      .sv-counter { gap: 16px; min-height: 180px; }
      .sv-serve { min-width: 96px; height: 70px; padding: 0 14px; }
      .sv-serve img { width: 34px; height: 34px; }
      .sv-row { gap: 12px; padding-bottom: 112px; }
      .sv-pet { width: 45vw; height: 45vw; }
      .sv-cup { width: 88px; height: 114px; bottom: 22px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sv-motion, .sv-img, .sv-pet, .sv-serve, .sv-new-drink, .sv-cup { animation: none !important; }
    }
  `);

  const MAX_SIPS = 2;
  let root, alive, timers, intervals, mix, mixMethod, sipsLeft, saidForDrink, saidMixerIntro, pouring, mixing, scene, saved, dragState;
  const petTimers = { kat: {}, hund: {} };
  const drinkingPet = { kat: false, hund: false };
  const sipCooldown = { kat: 0, hund: 0 };

  const later = (fn, ms) => { const id = setTimeout(() => alive && fn(), ms); timers.push(id); return id; };
  const every = (fn, ms) => { const id = setInterval(() => alive && fn(), ms); intervals.push(id); return id; };

  function loadSaved() {
    try {
      const v = JSON.parse(localStorage.getItem(GEM_KEY));
      if (v && Array.isArray(v.komboer)) return v;
    } catch (e) {}
    return { komboer: [], serveret: 0 };
  }
  function saveState() {
    try { localStorage.setItem(GEM_KEY, JSON.stringify(saved)); } catch (e) {}
  }

  /* ==================== LYDEFFEKTER ==================== */
  function playGulp() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(520, now + 0.13);
      o.frequency.exponentialRampToValueAtTime(180, now + 0.23);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.26);
    } catch (e) {}
  }

  function playPourSound() {
    Spil.tone([340, 420, 520, 660, 780], 0.065, "sine");
  }

  function playFireWhoosh() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 1.15);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.setValueAtTime(220, now);
      filt.frequency.exponentialRampToValueAtTime(980, now + 0.25);
      filt.frequency.exponentialRampToValueAtTime(340, now + 1.1);
      filt.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.28, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.12);
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start(now); src.stop(now + 1.15);
    } catch (e) {}
  }

  function playKettleWhistle() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(920, now);
      o.frequency.exponentialRampToValueAtTime(1480, now + 0.35);
      o.frequency.exponentialRampToValueAtTime(1260, now + 0.55);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.6);
    } catch (e) {}
  }

  function playSfx(kind) {
    if (kind === "sour")    Spil.tone([660, 620, 740, 580, 820], 0.07, "triangle");
    if (kind === "sugar")   Spil.tone([523, 659, 784, 1047, 784, 1047, 1319], 0.06, "triangle");
    if (kind === "spicy")   playFireWhoosh();
    if (kind === "cold")    Spil.tone([1100, 1320, 1100, 1480, 1100], 0.055, "sine");
    if (kind === "sleepy")  Spil.tone([440, 392, 349, 293], 0.15, "sine");
    if (kind === "tiny")    Spil.tone([980, 1240, 1560], 0.08, "sine");
    if (kind === "giant")   Spil.tone([180, 140, 110], 0.15, "sawtooth");
    if (kind === "bubbles") Spil.tone([380, 520, 680, 860], 0.08, "sine");
    if (kind === "combo")   Spil.sfx.fanfare();
  }

  /* ==================== GLAS-SVG (BRUGES I ALLE 3 SCENER) ==================== */
  function cupSvgMarkup(prefix) {
    return `<svg viewBox="0 0 90 120">
      <defs>
        <clipPath id="${prefix}-clip"><path d="M16 28 L74 28 L66 108 Q65 113 60 113 L30 113 Q25 113 24 108 Z"/></clipPath>
        <linearGradient id="${prefix}-rb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff6b8b"/><stop offset="25%" stop-color="#ffd93d"/>
          <stop offset="50%" stop-color="#6bcb77"/><stop offset="75%" stop-color="#4d96ff"/>
          <stop offset="100%" stop-color="#b983ff"/>
        </linearGradient>
        <linearGradient id="${prefix}-blend" x1="0" y1="0" x2="0" y2="1">
          <stop id="${prefix}-b0" offset="0%" stop-color="#ffe135"/>
          <stop id="${prefix}-b1" offset="50%" stop-color="#ff66b5"/>
          <stop id="${prefix}-b2" offset="100%" stop-color="#5ce1e6"/>
        </linearGradient>
      </defs>
      <path d="M56 34 L64 6 L80 2" fill="none" stroke="#ff6b8b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M56 34 L64 6 L80 2" fill="none" stroke="#ffffff" stroke-width="7" stroke-dasharray="6 8" stroke-linecap="round" opacity="0.6"/>
      <g clip-path="url(#${prefix}-clip)">
        <rect id="${prefix}-l0" x="10" y="116" width="70" height="30" fill="#ffe135" style="transition: y 0.35s ease, fill 0.35s;"/>
        <rect id="${prefix}-l1" x="10" y="116" width="70" height="30" fill="#ff66b5" style="transition: y 0.35s ease, fill 0.35s;"/>
        <rect id="${prefix}-l2" x="10" y="116" width="70" height="34" fill="#5ce1e6" style="transition: y 0.35s ease, fill 0.35s;"/>
        <g id="${prefix}-foam" opacity="0" style="transition: opacity 0.3s;">
          <circle cx="26" cy="36" r="10" fill="rgba(255,255,255,0.88)"/>
          <circle cx="42" cy="34" r="11" fill="rgba(255,255,255,0.92)"/>
          <circle cx="58" cy="36" r="10" fill="rgba(255,255,255,0.88)"/>
        </g>
        <g id="${prefix}-fizz" opacity="0" style="transition: opacity 0.3s;">
          <circle cx="28" cy="96" r="3.5" fill="rgba(255,255,255,0.85)"/>
          <circle cx="58" cy="92" r="4" fill="rgba(255,255,255,0.85)"/>
          <circle cx="42" cy="82" r="3" fill="rgba(255,255,255,0.85)"/>
          <circle cx="32" cy="68" r="4.5" fill="rgba(255,255,255,0.85)"/>
          <circle cx="55" cy="62" r="3.5" fill="rgba(255,255,255,0.85)"/>
          <circle cx="45" cy="48" r="4" fill="rgba(255,255,255,0.85)"/>
          <circle cx="30" cy="44" r="3" fill="rgba(255,255,255,0.85)"/>
        </g>
        <circle cx="34" cy="95" r="4" fill="rgba(255,255,255,0.65)"/>
        <circle cx="54" cy="76" r="3" fill="rgba(255,255,255,0.65)"/>
        <circle cx="44" cy="56" r="4.5" fill="rgba(255,255,255,0.55)"/>
      </g>
      <path d="M14 26 L76 26 L67 109 Q66 115 60 115 L30 115 Q24 115 23 109 Z"
            fill="rgba(255,255,255,0.22)" stroke="#4a2e1b" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M23 36 L29 102" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
  }

  function syncCupLayers(prefix) {
    const l0 = root.querySelector(`#${prefix}-l0`);
    const l1 = root.querySelector(`#${prefix}-l1`);
    const l2 = root.querySelector(`#${prefix}-l2`);
    const foam = root.querySelector(`#${prefix}-foam`);
    const fizz = root.querySelector(`#${prefix}-fizz`);
    if (!l0) return;
    const isCafe = prefix === "svc";
    const isLab = prefix === "svl";
    const hasDrink = isCafe ? (mix.length > 0 && sipsLeft > 0) : (mix.length > 0);
    if (!hasDrink) {
      l0.setAttribute("y", "116"); l1.setAttribute("y", "116"); l2.setAttribute("y", "116");
      if (foam) foam.setAttribute("opacity", "0");
      if (fizz) fizz.setAttribute("opacity", "0");
      return;
    }
    const isRb = new Set(mix.map(d => d.id)).size >= 3;
    const blended = !isLab && (mixMethod === "blender" || mixMethod === "presser");
    if (blended) {
      const c0 = mix[0].color;
      const c1 = (mix[1] || mix[0]).color;
      const c2 = (mix[2] || mix[1] || mix[0]).color;
      const b0 = root.querySelector(`#${prefix}-b0`);
      const b1 = root.querySelector(`#${prefix}-b1`);
      const b2 = root.querySelector(`#${prefix}-b2`);
      if (b0) { b0.setAttribute("stop-color", c2); b1.setAttribute("stop-color", c1); b2.setAttribute("stop-color", c0); }
    }
    const fill = (i) => isRb ? `url(#${prefix}-rb)` : blended ? `url(#${prefix}-blend)` : mix[i].color;

    // I caféen synker væsken tydeligt ned i takt med de 2 slurke (100% -> 50% -> 0%)
    const frac = isCafe ? (sipsLeft / MAX_SIPS) : 1;
    l0.setAttribute("y", String(Math.round(113 - 27 * frac)));
    l0.setAttribute("height", "30");
    l0.setAttribute("fill", fill(0));
    if (mix.length >= 2) {
      l1.setAttribute("y", String(Math.round(113 - 53 * frac)));
      l1.setAttribute("height", String(Math.ceil(27 * frac) + 2));
      l1.setAttribute("fill", fill(1));
    } else l1.setAttribute("y", "116");
    if (mix.length >= 3) {
      l2.setAttribute("y", String(Math.round(113 - 81 * frac)));
      l2.setAttribute("height", String(Math.ceil(29 * frac) + 2));
      l2.setAttribute("fill", fill(2));
    } else l2.setAttribute("y", "116");

    if (foam) foam.setAttribute("opacity", (!isLab && (mixMethod === "blender" || mixMethod === "shaker") && (!isCafe || sipsLeft >= MAX_SIPS)) ? "1" : "0");
    if (fizz) fizz.setAttribute("opacity", (!isLab && (mixMethod === "brus" || mixMethod === "shaker")) ? "1" : "0");
  }

  function syncAllUI() {
    syncCupLayers("svl");
    syncCupLayers("svm");
    syncCupLayers("svc");

    const rinse = root.querySelector(".sv-rinse");
    const toMixer = root.querySelector(".sv-to-mixer");
    if (rinse) rinse.classList.toggle("hide", mix.length === 0);
    if (toMixer) toMixer.classList.toggle("hide", mix.length === 0);

    const hasCafeDrink = mix.length > 0 && sipsLeft > 0;
    const anyDrinking = drinkingPet.kat || drinkingPet.hund;
    const cafeCup = root.querySelector(".sv-cup");
    const newBtn = root.querySelector(".sv-new-drink");
    if (cafeCup) {
      cafeCup.classList.toggle("empty", !hasCafeDrink);
      cafeCup.classList.toggle("ready", scene === "cafe" && hasCafeDrink && !dragState);
    }
    if (newBtn) newBtn.classList.toggle("show", scene === "cafe" && !hasCafeDrink && !anyDrinking);

    root.querySelectorAll(".sv-pet").forEach(el => {
      const p = el.dataset.pet;
      el.classList.toggle("eager", scene === "cafe" && hasCafeDrink && !drinkingPet[p]);
    });
  }

  function renderStars() {
    const box = root.querySelector(".sv-stars");
    if (!box) return;
    box.innerHTML = KOMBO_IDS.map(id =>
      `<span class="sv-star${saved.komboer.includes(id) ? " on" : ""}">⭐</span>`
    ).join("");
  }

  let saidCafeIntro = false;

  /* ==================== SCENE-SKIFT (HYLDE -> MIKSER -> CAFÉ) ==================== */
  function goScene(next) {
    if (!alive) return;
    closeStation();
    scene = next;
    const lab = root.querySelector(".sv-lab");
    const mixer = root.querySelector(".sv-mixer");
    const cafe = root.querySelector(".sv-cafe");
    const resetBtn = root.querySelector(".sv-btn-reset");
    const backBtn = root.querySelector(".sv-btn-back");

    lab.classList.remove("out-left", "out-right");
    mixer.classList.remove("out-left", "out-right");
    cafe.classList.remove("out-left", "out-right");

    if (next === "lab") {
      mixer.classList.add("out-right");
      cafe.classList.add("out-right");
      resetBtn.hidden = true;
      backBtn.hidden = true;
    } else if (next === "mixer") {
      lab.classList.add("out-left");
      cafe.classList.add("out-right");
      resetBtn.hidden = true;
      backBtn.hidden = false;
      if (!saidMixerIntro) {
        saidMixerIntro = true;
        later(() => {
          if (scene === "mixer" && !mixing) {
            Spil.say("Nu skal vi mikse! Prøv blenderen, shakeren, presseren eller brus-maskinen!", null, "sv-mikser");
          }
        }, 350);
      }
    } else {
      lab.classList.add("out-left");
      mixer.classList.add("out-left");
      resetBtn.hidden = false;
      backBtn.hidden = false;
      if (!saidCafeIntro && mix.length > 0 && sipsLeft > 0) {
        saidCafeIntro = true;
        later(() => {
          if (scene === "cafe" && !drinkingPet.kat && !drinkingPet.hund && sipsLeft > 0) {
            Spil.say("Hvem skal smage din sodavand? Katten eller hunden?", null, "sv-cafe");
          }
        }, 350);
      }
    }
    syncAllUI();
  }

  /* ==================== SCENE 2: INTERAKTIV MASKINE-STATION ==================== */
  let station = null;

  function stopBlendMotor() {
    if (!station || !station.motor) return;
    try {
      const m = station.motor;
      const now = Spil.audio().currentTime;
      m.g.gain.cancelScheduledValues(now);
      m.g.gain.setTargetAtTime(0.0001, now, 0.04);
      m.o.stop(now + 0.12);
    } catch (e) {}
    station.motor = null;
  }

  function startBlendMotor() {
    if (!station || station.motor) return;
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(125, now);
      o.frequency.exponentialRampToValueAtTime(280, now + 0.45);
      filt.type = "lowpass"; filt.frequency.value = 640;
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.13, now + 0.08);
      o.connect(filt); filt.connect(g); g.connect(ctx.destination);
      o.start(now);
      station.motor = { o, g };
    } catch (e) {}
  }

  function playShortShake() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.1);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass"; filt.frequency.value = 2100 + Math.random() * 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start(now);
    } catch (e) {}
  }

  function playShortPress() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(360, now);
      o.frequency.exponentialRampToValueAtTime(110, now + 0.2);
      o.frequency.exponentialRampToValueAtTime(220, now + 0.34);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.37);
    } catch (e) {}
  }

  function playShortFizz() {
    try {
      const ctx = Spil.audio(), now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.38);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass"; filt.frequency.value = 3400; filt.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start(now);
      Spil.tone([560, 740, 980, 1220], 0.055, "sine");
    } catch (e) {}
  }

  function closeStation() {
    stopBlendMotor();
    if (station && station.raf) cancelAnimationFrame(station.raf);
    if (station && station.el) station.el.remove();
    station = null;
    mixing = false;
  }

  function setStationCupFill(cupEl, filled, colors, method) {
    const l0 = cupEl.querySelector("#svs-l0");
    const l1 = cupEl.querySelector("#svs-l1");
    const l2 = cupEl.querySelector("#svs-l2");
    const foam = cupEl.querySelector("#svs-foam");
    const fizz = cupEl.querySelector("#svs-fizz");
    if (!l0) return;
    if (!filled) {
      l0.setAttribute("y", "116"); l1.setAttribute("y", "116"); l2.setAttribute("y", "116");
      if (foam) foam.setAttribute("opacity", "0");
      if (fizz) fizz.setAttribute("opacity", "0");
      return;
    }
    const isRb = new Set(mix.map(d => d.id)).size >= 3;
    const blended = method === "blender" || method === "presser";
    if (blended) {
      const b0 = cupEl.querySelector("#svs-b0"), b1 = cupEl.querySelector("#svs-b1"), b2 = cupEl.querySelector("#svs-b2");
      if (b0) { b0.setAttribute("stop-color", colors[2]); b1.setAttribute("stop-color", colors[1]); b2.setAttribute("stop-color", colors[0]); }
    }
    const fill = (i) => isRb ? "url(#svs-rb)" : blended ? "url(#svs-blend)" : colors[i];
    l0.setAttribute("y", "86"); l0.setAttribute("fill", fill(0));
    if (mix.length >= 2) { l1.setAttribute("y", "60"); l1.setAttribute("fill", fill(1)); } else l1.setAttribute("y", "116");
    if (mix.length >= 3) { l2.setAttribute("y", "32"); l2.setAttribute("fill", fill(2)); } else l2.setAttribute("y", "116");
    if (foam) foam.setAttribute("opacity", (method === "blender" || method === "shaker") ? "1" : "0");
    if (fizz) fizz.setAttribute("opacity", (method === "brus" || method === "shaker") ? "1" : "0");
  }

  function runMachine(m, btnEl) {
    if (!alive || mixing || mix.length === 0) return;
    mixing = true;

    const colors = [
      mix[0].color,
      (mix[1] || mix[0]).color,
      (mix[2] || mix[1] || mix[0]).color
    ];
    const arMap = { blender: "0.654", shaker: "0.578", presser: "0.949", brus: "0.76" };
    const hintMap = {
      blender: "Hold den røde knap nede! 🌀",
      shaker:  "Ryst shakeren frem og tilbage! ✨",
      presser: "Tryk og hold for at mase! 💦",
      brus:    "Pump den gule knap 3 gange! 🫧"
    };

    // Byg maskinens skræddersyede farve-overlay (med barnets præcise farver!)
    let overlaySvg = "";
    let hotspotHtml = "";
    if (m.id === "blender") {
      overlaySvg = `<svg class="sv-st-liq" viewBox="0 0 100 153">
        <defs>
          <clipPath id="sv-bl-clip"><path d="M16 24 L79 24 L71 93 Q70 96 66 96 L27 96 Q23 96 22 93 Z"/></clipPath>
          <linearGradient id="sv-bl-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${colors[2]}"/><stop offset="50%" stop-color="${colors[1]}"/><stop offset="100%" stop-color="${colors[0]}"/>
          </linearGradient>
        </defs>
        <g clip-path="url(#sv-bl-clip)">
          <rect class="sv-bl-l0" x="10" y="100" width="80" height="28" fill="${colors[0]}" opacity="0.88" style="transition: y 0.45s ease, fill 0.4s;"/>
          <rect class="sv-bl-l1" x="10" y="100" width="80" height="26" fill="${colors[1]}" opacity="0.88" style="transition: y 0.45s ease, fill 0.4s;"/>
          <rect class="sv-bl-l2" x="10" y="100" width="80" height="26" fill="${colors[2]}" opacity="0.88" style="transition: y 0.45s ease, fill 0.4s;"/>
          <g class="sv-swirl-g" opacity="0" style="transition: opacity 0.25s;">
            <path d="M48 44 C64 44 68 62 56 72 C46 80 30 74 32 60 C34 48 46 46 52 54" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="5" stroke-linecap="round"/>
            <circle cx="38" cy="54" r="5" fill="${colors[2]}" opacity="0.9"/>
            <circle cx="58" cy="66" r="5" fill="${colors[0]}" opacity="0.9"/>
            <circle cx="48" cy="78" r="4" fill="${colors[1]}" opacity="0.9"/>
          </g>
          <g class="sv-bl-foam" opacity="0" style="transition: opacity 0.35s;">
            <circle cx="28" cy="34" r="10" fill="rgba(255,255,255,0.9)"/>
            <circle cx="46" cy="31" r="12" fill="rgba(255,255,255,0.92)"/>
            <circle cx="64" cy="34" r="10" fill="rgba(255,255,255,0.9)"/>
          </g>
        </g>
      </svg>`;
      hotspotHtml = `<div class="sv-hotspot hide" style="left:47%; top:82%; width:64px; height:64px;"></div>`;
    } else if (m.id === "shaker") {
      overlaySvg = `<svg class="sv-st-liq" viewBox="0 0 100 173">
        <defs>
          <clipPath id="sv-sh-clip"><path d="M18 82 L82 82 L75 164 Q74 168 68 168 L32 168 Q26 168 25 164 Z"/></clipPath>
        </defs>
        <g clip-path="url(#sv-sh-clip)" opacity="0.88">
          <rect class="sv-sh-l0" x="12" y="172" width="76" height="32" fill="${colors[0]}" style="transition: y 0.45s ease;"/>
          <rect class="sv-sh-l1" x="12" y="172" width="76" height="30" fill="${colors[1]}" style="transition: y 0.45s ease;"/>
          <rect class="sv-sh-l2" x="12" y="172" width="76" height="30" fill="${colors[2]}" style="transition: y 0.45s ease;"/>
        </g>
      </svg>`;
      hotspotHtml = `<div class="sv-hotspot hide" style="left:50%; top:58%; width:76px; height:76px;"></div>`;
    } else if (m.id === "presser") {
      overlaySvg = `<svg class="sv-st-liq" viewBox="0 0 100 105">
        <defs>
          <clipPath id="sv-pr-clip"><path d="M12 56 L88 56 C86 84 74 97 50 97 C26 97 14 84 12 56 Z"/></clipPath>
        </defs>
        <g class="sv-pr-fruits" opacity="0" style="transition: opacity 0.35s, transform 0.12s; transform-origin: 50% 52%;">
          <circle cx="38" cy="44" r="9.5" fill="${colors[0]}" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>
          <circle cx="51" cy="39" r="10.5" fill="${colors[1]}" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>
          <circle cx="63" cy="45" r="9" fill="${colors[2]}" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>
        </g>
        <g clip-path="url(#sv-pr-clip)" opacity="0.9">
          <rect class="sv-pr-pool" x="8" y="100" width="84" height="46" fill="${colors[0]}" style="transition: y 0.15s ease, fill 0.35s;"/>
        </g>
      </svg>`;
      hotspotHtml = `<div class="sv-hotspot hide" style="left:58%; top:20%; width:64px; height:64px;"></div>`;
    } else {
      overlaySvg = `<div class="sv-fizz-jet"></div>`;
      hotspotHtml = `<div class="sv-hotspot hide" style="left:49%; top:10%; width:64px; height:64px;"></div>`;
    }

    const st = document.createElement("div");
    st.className = "sv-station";
    st.innerHTML = `
      <button class="sv-st-close" type="button" aria-label="Luk">✕</button>
      <div class="sv-st-hint">Hælder i ${m.label.toLowerCase()}...</div>
      <div class="sv-st-meter"><div class="sv-st-fill" style="background:linear-gradient(90deg, ${colors[0]}, ${colors[1]}, ${colors[2]})"></div></div>
      <div class="sv-st-stage">
        <div class="sv-st-cup">${cupSvgMarkup("svs")}</div>
        <div class="sv-st-stream" style="background:${colors[0]}"></div>
        <div class="sv-st-unit" role="button" aria-label="${m.label}">
          <div class="sv-st-art" style="--ar:${arMap[m.id]}">
            <img src="${STI}maskine-${m.id}.webp" alt="" draggable="false">
            ${overlaySvg}
            ${hotspotHtml}
          </div>
        </div>
      </div>
    `;
    root.querySelector(".sv-mixer").appendChild(st);
    requestAnimationFrame(() => st.classList.add("open"));

    const cupEl = st.querySelector(".sv-st-cup");
    const streamEl = st.querySelector(".sv-st-stream");
    const unitEl = st.querySelector(".sv-st-unit");
    const fillEl = st.querySelector(".sv-st-fill");
    const hintEl = st.querySelector(".sv-st-hint");
    const hotEl = st.querySelector(".sv-hotspot");

    setStationCupFill(cupEl, true, colors, null);

    station = {
      el: st, m, btnEl, progress: 0, phase: "pour-in", holding: false,
      motor: null, raf: null, lastTime: 0, drag: null, lastBurst: 0
    };

    st.querySelector(".sv-st-close").onclick = () => {
      Spil.sfx.click();
      closeStation();
    };

    // Hjælper til at opdatere visuel tilstand i maskinen under barnets leg
    function updateProgress(val) {
      if (!station || station.phase !== "play") return;
      station.progress = Math.max(0, Math.min(100, val));
      fillEl.style.width = station.progress + "%";

      if (m.id === "blender") {
        const sw = unitEl.querySelector(".sv-swirl-g");
        const fm = unitEl.querySelector(".sv-bl-foam");
        if (sw) sw.setAttribute("opacity", station.progress > 5 ? "0.95" : "0");
        if (fm) fm.setAttribute("opacity", station.progress > 50 ? String((station.progress - 50) / 50) : "0");
        if (station.progress > 45) {
          unitEl.querySelectorAll(".sv-bl-l0, .sv-bl-l1, .sv-bl-l2").forEach(r => r.setAttribute("fill", "url(#sv-bl-grad)"));
        }
      } else if (m.id === "presser") {
        const pool = unitEl.querySelector(".sv-pr-pool");
        const fr = unitEl.querySelector(".sv-pr-fruits");
        const art = unitEl.querySelector(".sv-st-art");
        const p = station.progress / 100;
        if (pool) {
          pool.setAttribute("y", String(Math.round(96 - p * 38)));
          pool.setAttribute("fill", p > 0.55 ? colors[1] : colors[0]);
        }
        if (fr) fr.style.transform = `scale(${(1 + p * 0.42).toFixed(2)}, ${(1 - p * 0.72).toFixed(2)})`;
        if (art && station.holding) {
          art.style.transform = `scale(${(1 + p * 0.18).toFixed(3)}, ${(1 - p * 0.30).toFixed(3)})`;
        }
      } else if (m.id === "brus") {
        const fizz = cupEl.querySelector("#svs-fizz");
        if (fizz) fizz.setAttribute("opacity", String(Math.min(1, station.progress / 60)));
      }

      if (station.progress >= 100) {
        if (m.id === "presser" && station.holding) {
          if (!station.graceTimer) {
            station.graceTimer = later(() => finishMachine(), 650);
          }
        } else {
          finishMachine();
        }
      }
    }

    // Trin 3: Hæld den færdige drink tilbage i glasset & luk stationen!
    function finishMachine() {
      if (!station || station.phase === "pour-out") return;
      station.phase = "pour-out";
      station.holding = false;
      stopBlendMotor();
      unitEl.classList.remove("blending", "shaking", "pressing", "fizzing", "dragging");
      unitEl.style.transform = "";
      const art = unitEl.querySelector(".sv-st-art");
      if (art) art.style.transform = "";
      if (hotEl) hotEl.classList.add("hide");

      mixMethod = m.id;
      root.querySelectorAll(".sv-machine").forEach(b => b.classList.toggle("picked", b === btnEl));
      hintEl.textContent = m.tag;
      Spil.sfx.right();
      Spil.burstAt(unitEl, m.ico);

      if (m.id === "brus") {
        // Glasset glider ud fra brus-maskinen, fyldt med perlende brus!
        setStationCupFill(cupEl, true, colors, "brus");
        later(() => {
          cupEl.style.left = "14%";
          cupEl.style.bottom = "18px";
          cupEl.style.transform = "scale(1.06)";
          Spil.burstAt(cupEl, "🫧");
        }, 240);
        later(() => {
          syncAllUI();
          const tagEl = root.querySelector(".sv-mix-tag");
          if (tagEl) { tagEl.textContent = m.tag; tagEl.classList.add("show"); later(() => tagEl.classList.remove("show"), 1800); }
          closeStation();
        }, 1150);
      } else {
        // Maskinen vipper hen mod det tomme glas og hælder den færdige drink tilbage!
        later(() => {
          unitEl.classList.add("tilting");
          streamEl.style.background = colors[1];
          streamEl.style.left = "24%";
          streamEl.style.top = "36%";
          streamEl.style.height = "140px";
        }, 180);
        later(() => {
          streamEl.classList.add("on");
          playPourSound();
          // Tøm maskinens væske mens glasset fyldes op igen med den nye miksede drink!
          unitEl.querySelectorAll(".sv-bl-l0,.sv-bl-l1,.sv-bl-l2,.sv-sh-l0,.sv-sh-l1,.sv-sh-l2,.sv-pr-pool").forEach(r => r.setAttribute("y", "180"));
          const sw = unitEl.querySelector(".sv-swirl-g"); if (sw) sw.setAttribute("opacity", "0");
          const fm = unitEl.querySelector(".sv-bl-foam"); if (fm) fm.setAttribute("opacity", "0");
          const fr = unitEl.querySelector(".sv-pr-fruits"); if (fr) fr.setAttribute("opacity", "0");
          setStationCupFill(cupEl, true, colors, m.id);
          Spil.burstAt(cupEl, m.ico);
        }, 440);
        later(() => {
          streamEl.classList.remove("on");
          unitEl.classList.remove("tilting");
        }, 980);
        later(() => {
          syncAllUI();
          const tagEl = root.querySelector(".sv-mix-tag");
          if (tagEl) { tagEl.textContent = m.tag; tagEl.classList.add("show"); later(() => tagEl.classList.remove("show"), 1800); }
          closeStation();
        }, 1350);
      }
    }

    // Trin 1: Hæld barnets valgte farver fra glasset over i maskinen (glasset bliver tomt!)
    if (m.id === "brus") {
      later(() => {
        if (!station) return;
        cupEl.style.left = "38.5%";
        cupEl.style.bottom = "52px";
        cupEl.style.transform = "scale(0.74)";
        Spil.sfx.click();
      }, 120);
      later(() => {
        if (!station) return;
        station.phase = "play";
        hintEl.textContent = hintMap.brus;
        if (hotEl) hotEl.classList.remove("hide");
      }, 620);
    } else {
      later(() => {
        if (!station) return;
        cupEl.style.left = "35%";
        cupEl.style.bottom = "64%";
        cupEl.style.transform = "rotate(56deg) scale(0.92)";
      }, 100);
      later(() => {
        if (!station) return;
        streamEl.style.left = "50%";
        streamEl.style.top = "26%";
        streamEl.style.height = "125px";
        streamEl.classList.add("on");
        playPourSound();
        setStationCupFill(cupEl, false, colors, null); // Glasset bliver tomt!
        // Maskinen fyldes med netop barnets valgte farver!
        if (m.id === "blender") {
          const l0 = unitEl.querySelector(".sv-bl-l0"), l1 = unitEl.querySelector(".sv-bl-l1"), l2 = unitEl.querySelector(".sv-bl-l2");
          if (l0) l0.setAttribute("y", "72");
          if (l1 && mix.length >= 2) l1.setAttribute("y", "52");
          if (l2 && mix.length >= 3) l2.setAttribute("y", "34");
        } else if (m.id === "shaker") {
          const l0 = unitEl.querySelector(".sv-sh-l0"), l1 = unitEl.querySelector(".sv-sh-l1"), l2 = unitEl.querySelector(".sv-sh-l2");
          if (l0) l0.setAttribute("y", "140");
          if (l1 && mix.length >= 2) l1.setAttribute("y", "114");
          if (l2 && mix.length >= 3) l2.setAttribute("y", "88");
        } else if (m.id === "presser") {
          const fr = unitEl.querySelector(".sv-pr-fruits");
          const pool = unitEl.querySelector(".sv-pr-pool");
          if (fr) fr.setAttribute("opacity", "1");
          if (pool) pool.setAttribute("y", "92");
        }
      }, 420);
      later(() => {
        if (!station) return;
        streamEl.classList.remove("on");
        cupEl.style.left = "10%";
        cupEl.style.bottom = "18px";
        cupEl.style.transform = "rotate(0deg) scale(1)";
        station.phase = "play";
        hintEl.textContent = hintMap[m.id];
        if (hotEl) hotEl.classList.remove("hide");
      }, 880);
    }

    // Trin 2: 4 helt forskellige interaktioner!
    if (m.id === "blender") {
      const tick = (ts) => {
        if (!station || !alive) return;
        if (station.holding && station.phase === "play") {
          const dt = station.lastTime ? Math.min(0.08, (ts - station.lastTime) / 1000) : 0.016;
          station.lastTime = ts;
          updateProgress(station.progress + dt * 47); // ~2.1 sek hold
          if (ts - station.lastBurst > 320) {
            station.lastBurst = ts;
            Spil.burstAt(unitEl, "🌀");
          }
          station.raf = requestAnimationFrame(tick);
        }
      };
      const startHold = (e) => {
        if (!station || station.phase !== "play") return;
        e.preventDefault();
        station.holding = true;
        station.lastTime = 0;
        unitEl.classList.add("blending");
        if (hotEl) hotEl.classList.add("hide");
        startBlendMotor();
        station.raf = requestAnimationFrame(tick);
      };
      const endHold = () => {
        if (!station) return;
        station.holding = false;
        unitEl.classList.remove("blending");
        stopBlendMotor();
        if (station.phase === "play" && hotEl) hotEl.classList.remove("hide");
      };
      unitEl.addEventListener("pointerdown", startHold);
      unitEl.addEventListener("pointerup", endHold);
      unitEl.addEventListener("pointercancel", endHold);
      unitEl.addEventListener("pointerleave", endHold);
    } else if (m.id === "shaker") {
      const doShake = (amt) => {
        if (!station || station.phase !== "play") return;
        playShortShake();
        unitEl.classList.remove("shaking");
        void unitEl.offsetWidth;
        unitEl.classList.add("shaking");
        Spil.burstAt(unitEl, mix[Math.floor(Math.random() * mix.length)].ico);
        updateProgress(station.progress + amt);
      };
      unitEl.addEventListener("pointerdown", (e) => {
        if (!station || station.phase !== "play") return;
        e.preventDefault();
        try { unitEl.setPointerCapture(e.pointerId); } catch (_) {}
        unitEl.classList.add("dragging");
        if (hotEl) hotEl.classList.add("hide");
        station.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      });
      unitEl.addEventListener("pointermove", (e) => {
        if (!station || !station.drag || e.pointerId !== station.drag.id || station.phase !== "play") return;
        const dx = Math.max(-70, Math.min(70, e.clientX - station.drag.sx));
        const dy = Math.max(-55, Math.min(55, e.clientY - station.drag.sy));
        unitEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.28}deg)`;
        const dist = Math.hypot(e.clientX - station.drag.lx, e.clientY - station.drag.ly);
        if (dist > 58) {
          station.drag.lx = e.clientX; station.drag.ly = e.clientY;
          station.drag.moved = true;
          doShake(8);
        }
      });
      const endShake = (e) => {
        if (!station || !station.drag || e.pointerId !== station.drag.id) return;
        const wasMoved = station.drag.moved;
        try { unitEl.releasePointerCapture(e.pointerId); } catch (_) {}
        station.drag = null;
        unitEl.classList.remove("dragging");
        unitEl.style.transform = "";
        if (!wasMoved) doShake(12); // Tap virker også for de mindste!
      };
      unitEl.addEventListener("pointerup", endShake);
      unitEl.addEventListener("pointercancel", endShake);
    } else if (m.id === "presser") {
      const art = unitEl.querySelector(".sv-st-art");
      let lastSquish = 0;
      const tick = (ts) => {
        if (!station || !alive) return;
        if (station.holding && station.phase === "play") {
          const dt = station.lastTime ? Math.min(0.08, (ts - station.lastTime) / 1000) : 0.016;
          station.lastTime = ts;
          const nextP = station.progress + dt * 56; // ~1.8 sek hold
          if (nextP - lastSquish >= 28) {
            lastSquish = nextP;
            playShortPress();
            Spil.burstAt(unitEl, "💦");
          }
          updateProgress(nextP);
          if (station && station.holding && station.phase === "play") {
            station.raf = requestAnimationFrame(tick);
          }
        }
      };
      const startHold = (e) => {
        if (!station || station.phase !== "play") return;
        e.preventDefault();
        station.holding = true;
        station.lastTime = 0;
        if (hotEl) hotEl.classList.add("hide");
        playShortPress();
        station.raf = requestAnimationFrame(tick);
      };
      const endHold = () => {
        if (!station) return;
        const wasHolding = station.holding;
        station.holding = false;
        if (art) art.style.transform = "";
        if (wasHolding && station.phase === "play") {
          if (station.progress >= 100) {
            finishMachine();
          } else if (hotEl) {
            hotEl.classList.remove("hide");
          }
        }
      };
      unitEl.addEventListener("pointerdown", startHold);
      unitEl.addEventListener("pointerup", endHold);
      unitEl.addEventListener("pointercancel", endHold);
      unitEl.addEventListener("pointerleave", endHold);
    } else if (m.id === "brus") {
      unitEl.addEventListener("pointerdown", (e) => {
        if (!station || station.phase !== "play") return;
        e.preventDefault();
        playShortFizz();
        unitEl.classList.remove("fizzing");
        void unitEl.offsetWidth;
        unitEl.classList.add("fizzing");
        later(() => unitEl && unitEl.classList.remove("fizzing"), 340);
        Spil.burstAt(cupEl, "🫧");
        updateProgress(station.progress + 34);
      });
    }
  }

  /* ==================== SCENE 1: HÆLD FRA HYLDE ==================== */
  function pourFromBottle(drink, btnEl) {
    if (!alive || pouring) return;
    pouring = true;
    if (mix.length >= 3) mix = [];
    Spil.say(drink.label + "!", null, drink.nameKey);

    const lab = root.querySelector(".sv-lab");
    const cupEl = root.querySelector(".sv-lab-cup");
    const lr = lab.getBoundingClientRect();
    const br = btnEl.getBoundingClientRect();
    const cr = cupEl.getBoundingClientRect();

    btnEl.classList.add("pouring-src");

    const fly = document.createElement("div");
    fly.className = "sv-pourer";
    fly.innerHTML = `<img src="${STI}flaske-${drink.id}.webp" alt="" draggable="false">`;
    fly.style.left = (br.left - lr.left + br.width / 2 - 48) + "px";
    fly.style.top  = (br.top - lr.top + br.height / 2 - 65) + "px";
    lab.appendChild(fly);

    const stream = document.createElement("div");
    stream.className = "sv-stream";
    stream.style.background = drink.color;
    const cupCx = cr.left - lr.left + cr.width * 0.5;
    const pourTop = cr.top - lr.top - 52;
    stream.style.left = cupCx + "px";
    stream.style.top  = pourTop + "px";
    stream.style.height = (cr.height * 0.72 + 46) + "px";
    lab.appendChild(stream);

    // 1) Flyv over glasset og vip
    requestAnimationFrame(() => {
      fly.style.left = (cupCx + 18) + "px";
      fly.style.top  = (pourTop - 78) + "px";
      fly.style.transform = "rotate(-118deg) scale(1.06)";
    });

    // 2) Hæld farvet stråle ned i glasset!
    later(() => {
      stream.classList.add("on");
      playPourSound();
      mix.push(drink);
      mixMethod = null;
      sipsLeft = MAX_SIPS;
      saidForDrink = false;
      syncAllUI();
      cupEl.classList.add("bump");
      Spil.burstAt(cupEl, drink.ico);
    }, 320);

    later(() => {
      cupEl.classList.remove("bump");
      stream.classList.remove("on");
      fly.style.left = (br.left - lr.left + br.width / 2 - 46) + "px";
      fly.style.top  = (br.top - lr.top + br.height / 2 - 63) + "px";
      fly.style.transform = "rotate(0deg) scale(1)";
    }, 760);

    later(() => {
      fly.remove();
      stream.remove();
      btnEl.classList.remove("pouring-src");
      pouring = false;
    }, 1080);
  }

  /* ==================== SCENE 2: TEGNEDE SVG-EFFEKTER ==================== */
  function spawnFireBreath(slot) {
    const el = document.createElement("div");
    el.className = "sv-flame";
    el.innerHTML = `<svg viewBox="0 0 160 180">
      <path d="M80 172 C32 166 10 124 22 76 C30 46 56 34 62 10 C82 28 92 48 92 64 C104 48 112 28 110 16 C138 42 152 84 140 124 C130 156 108 174 80 172 Z" fill="#ff5238"/>
      <path d="M80 168 C46 162 32 128 42 90 C48 68 64 58 70 36 C84 52 90 68 90 80 C98 68 104 54 104 46 C122 66 130 100 120 130 C112 154 98 168 80 168 Z" fill="#ff9f2e"/>
      <path d="M80 164 C60 160 52 136 60 112 C66 96 74 88 80 70 C92 86 102 104 100 130 C98 150 90 164 80 164 Z" fill="#fff066"/>
      <circle cx="32" cy="40" r="6" fill="#ff9f2e"/><circle cx="132" cy="48" r="5" fill="#fff066"/><circle cx="88" cy="14" r="4.5" fill="#ff5238"/>
    </svg>`;
    slot.appendChild(el);
    later(() => el.remove(), 1700);
  }

  function spawnEarSteam(slot) {
    const cloudSvg = `<svg viewBox="0 0 70 50"><path d="M18 42 C8 42 4 34 8 26 C6 18 14 10 24 12 C30 4 46 4 50 14 C60 14 66 24 62 32 C64 38 58 42 50 42 Z" fill="#ffffff" opacity="0.92"/></svg>`;
    ["left", "right"].forEach(side => {
      const s = document.createElement("div"); s.className = "sv-steam " + side; s.innerHTML = cloudSvg;
      slot.appendChild(s); later(() => s.remove(), 1200);
    });
    const sw = document.createElement("div"); sw.className = "sv-sweat";
    sw.innerHTML = `<svg viewBox="0 0 28 36"><path d="M14 2 C14 2 26 16 26 24 C26 30 20 35 14 35 C8 35 2 30 2 24 C2 16 14 2 14 2 Z" fill="#7dd6ff"/></svg>`;
    slot.appendChild(sw); later(() => sw.remove(), 900);
  }

  function spawnIceCube(slot, pet) {
    const el = document.createElement("div"); el.className = "sv-icecube";
    el.innerHTML = `<svg viewBox="0 0 220 220">
      <rect x="14" y="14" width="192" height="192" rx="30" fill="rgba(160, 232, 255, 0.42)" stroke="rgba(255, 255, 255, 0.92)" stroke-width="6"/>
      <rect x="26" y="26" width="168" height="168" rx="22" fill="none" stroke="rgba(130, 215, 255, 0.55)" stroke-width="4"/>
      <path d="M36 68 L74 30 L102 30 L36 96 Z" fill="rgba(255, 255, 255, 0.62)"/>
      <path d="M36 118 L124 30 L140 30 L36 134 Z" fill="rgba(255, 255, 255, 0.34)"/>
      <path d="M180 156 L152 184 L168 184 L184 168 Z" fill="rgba(255, 255, 255, 0.55)"/>
      <circle cx="172" cy="48" r="6" fill="#ffffff" opacity="0.9"/><circle cx="52" cy="172" r="4.5" fill="#ffffff" opacity="0.85"/>
    </svg>`;
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      Spil.tone([1200, 900, 1500], 0.05, "triangle");
      spawnSvgFly(slot, "ice", 8);
      el.classList.add("melt");
      later(() => el.remove(), 420);
      calmPet(pet);
    });
    slot.appendChild(el);
  }

  function spawnSleepMoon(slot) {
    const el = document.createElement("div"); el.className = "sv-moon";
    el.innerHTML = `<svg viewBox="0 0 80 80">
      <path d="M46 12 C28 14 16 30 18 48 C20 64 36 74 52 70 C60 68 66 63 70 56 C56 60 40 52 38 36 C36 26 40 18 46 12 Z" fill="#ffe47a"/>
      <path d="M58 14 L60 20 L66 22 L60 24 L58 30 L56 24 L50 22 L56 20 Z" fill="#fff6b8"/><circle cx="70" cy="36" r="3" fill="#fff6b8"/>
    </svg>`;
    slot.appendChild(el);
  }

  function spawnSleepZ(slot) {
    const fx = root.querySelector(".sv-fx");
    const r = slot.getBoundingClientRect(), sr = root.querySelector(".sv-cafe").getBoundingClientRect();
    const el = document.createElement("div"); el.className = "sv-svg-riser";
    const sz = 24 + Math.random() * 14;
    el.style.width = sz + "px"; el.style.height = sz + "px";
    el.style.left = (r.left - sr.left + r.width * (0.42 + Math.random() * 0.25)) + "px";
    el.style.top  = (r.top - sr.top + r.height * 0.24) + "px";
    el.style.setProperty("--dx", (18 + Math.random() * 34) + "px");
    el.innerHTML = `<svg viewBox="0 0 40 40"><path d="M8 10 H32 L10 30 H32" fill="none" stroke="#8a6be8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    fx.appendChild(el); later(() => el.remove(), 2450);
  }

  function spawnSourZigs(slot) {
    const el = document.createElement("div"); el.className = "sv-zigs";
    el.innerHTML = `<svg viewBox="0 0 240 160">
      <path d="M24 38 L10 54 L26 68 L12 84" fill="none" stroke="#ffcf24" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M216 38 L230 54 L214 68 L228 84" fill="none" stroke="#ffcf24" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M38 14 L26 24 L36 34" fill="none" stroke="#a6e22e" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M202 14 L214 24 L204 34" fill="none" stroke="#a6e22e" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    slot.appendChild(el);
  }

  function spawnGiantDust(slot) {
    const cloud = `<svg viewBox="0 0 70 46"><path d="M16 40 C6 40 4 30 10 24 C10 14 22 8 32 14 C40 8 56 12 58 24 C66 26 66 40 54 40 Z" fill="#f0d9b5" opacity="0.9"/></svg>`;
    ["left", "right"].forEach(side => {
      const d = document.createElement("div"); d.className = "sv-dust " + side; d.innerHTML = cloud;
      slot.appendChild(d); later(() => d.remove(), 900);
    });
  }

  function spawnSvgFly(slot, kind, count = 7) {
    const fx = root.querySelector(".sv-fx");
    const r = slot.getBoundingClientRect(), sr = root.querySelector(".sv-cafe").getBoundingClientRect();
    const cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height * 0.42;
    const shapes = {
      sugar: [
        `<svg viewBox="0 0 36 36"><path d="M18 2 L22 13 L34 14 L25 22 L28 34 L18 27 L8 34 L11 22 L2 14 L14 13 Z" fill="#ffd93d"/></svg>`,
        `<svg viewBox="0 0 36 36"><path d="M20 2 L8 20 H18 L15 34 L28 16 H18 Z" fill="#ff66b5"/></svg>`,
        `<svg viewBox="0 0 36 36"><path d="M18 2 L22 13 L34 14 L25 22 L28 34 L18 27 L8 34 L11 22 L2 14 L14 13 Z" fill="#6ce5e8"/></svg>`
      ],
      sour: [
        `<svg viewBox="0 0 28 36"><path d="M14 2 C14 2 26 16 26 24 C26 30 20 35 14 35 C8 35 2 30 2 24 C2 16 14 2 14 2 Z" fill="#ffe135"/></svg>`,
        `<svg viewBox="0 0 28 36"><path d="M14 2 C14 2 26 16 26 24 C26 30 20 35 14 35 C8 35 2 30 2 24 C2 16 14 2 14 2 Z" fill="#b7eb34"/></svg>`
      ],
      ice: [
        `<svg viewBox="0 0 32 32"><polygon points="16,2 28,12 22,30 6,24 4,10" fill="#a8ecff" stroke="#ffffff" stroke-width="2.5"/></svg>`,
        `<svg viewBox="0 0 32 32"><polygon points="16,4 30,16 16,28 2,16" fill="#d8f7ff" stroke="#ffffff" stroke-width="2.5"/></svg>`
      ]
    };
    const list = shapes[kind] || shapes.sugar;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div"); p.className = "sv-fly";
      const sz = 22 + Math.random() * 14;
      p.style.width = sz + "px"; p.style.height = sz + "px"; p.innerHTML = list[i % list.length];
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 62 + Math.random() * 95;
      p.style.left = cx + "px"; p.style.top = cy + "px";
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", (Math.sin(ang) * dist - 24) + "px");
      p.style.setProperty("--rot", (Math.random() * 160 - 80) + "deg");
      fx.appendChild(p); later(() => p.remove(), 1000);
    }
  }

  function spawnRiser(petEl, symbol) {
    const fx = root.querySelector(".sv-fx");
    const r = petEl.getBoundingClientRect(), sr = root.querySelector(".sv-cafe").getBoundingClientRect();
    const el = document.createElement("div"); el.className = "sv-riser"; el.textContent = symbol;
    el.style.left = (r.left - sr.left + r.width * (0.28 + Math.random() * 0.44)) + "px";
    el.style.top  = (r.top - sr.top + r.height * 0.25) + "px";
    el.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
    fx.appendChild(el); later(() => el.remove(), 2450);
  }

  function spawnBubble(petEl, rainbow) {
    const fx = root.querySelector(".sv-fx");
    const r = petEl.getBoundingClientRect(), sr = root.querySelector(".sv-cafe").getBoundingClientRect();
    const b = document.createElement("div"); b.className = "sv-bubble";
    if (rainbow) {
      const cols = ["rgba(255,110,160,0.55)","rgba(255,220,90,0.55)","rgba(100,235,140,0.55)","rgba(110,180,255,0.55)","rgba(200,130,255,0.55)"];
      b.style.setProperty("--bcol", cols[Math.floor(Math.random() * cols.length)]);
    }
    b.style.left = (r.left - sr.left + r.width * (0.32 + Math.random() * 0.36)) + "px";
    b.style.top  = (r.top - sr.top + r.height * 0.45) + "px";
    b.style.setProperty("--sway", (Math.random() * 60 - 30) + "px");
    b.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      Spil.tone([523, 587, 659, 784, 880, 1047][Math.floor(Math.random() * 6)], 0.07, "sine");
      Spil.burstAt(b, "🫧"); b.remove();
    });
    fx.appendChild(b); later(() => b.remove(), 4300);
  }

  /* ==================== DYR-TILSTAND & SERVERING ==================== */
  function setPose(pet, pose) {
    const img = root.querySelector(`#sv-img-${pet}`);
    if (img) img.src = `${STI}${pet}-${pose}.webp`;
  }

  function clearPetOverlays(slot) {
    if (!slot) return;
    slot.querySelectorAll(".sv-flame, .sv-steam, .sv-sweat, .sv-icecube, .sv-moon, .sv-zigs, .sv-dust").forEach(el => el.remove());
  }

  function clearPetLoops(pet) {
    if (petTimers[pet].loop) { clearInterval(petTimers[pet].loop); petTimers[pet].loop = null; }
    if (petTimers[pet].alt)  { clearInterval(petTimers[pet].alt);  petTimers[pet].alt  = null; }
    if (petTimers[pet].calm) { clearTimeout(petTimers[pet].calm);  petTimers[pet].calm = null; }
  }

  function calmPet(pet) {
    if (!alive) return;
    clearPetLoops(pet);
    const slot = root.querySelector(`#sv-pet-${pet}`);
    if (!slot) return;
    const ice = slot.querySelector(".sv-icecube");
    if (ice && !ice.classList.contains("melt")) {
      ice.classList.add("melt");
      later(() => ice.remove(), 440);
    }
    slot.querySelectorAll(".sv-flame, .sv-steam, .sv-sweat, .sv-moon, .sv-zigs, .sv-dust").forEach(el => el.remove());
    const eager = slot.classList.contains("eager");
    slot.className = eager ? "sv-pet eager" : "sv-pet";
    setPose(pet, "idle");
  }

  function showTag(pet, text) {
    const el = root.querySelector(`#sv-tag-${pet}`);
    if (!el) return;
    el.textContent = text; el.classList.add("show");
    clearTimeout(petTimers[pet].tag);
    petTimers[pet].tag = later(() => el.classList.remove("show"), 2800);
  }

  function showBanner(text) {
    const el = root.querySelector(".sv-banner");
    if (!el) return;
    el.textContent = text; el.classList.add("show");
    clearTimeout(petTimers.banner);
    petTimers.banner = later(() => el.classList.remove("show"), 3200);
  }

  function onPetTap(pet) {
    if (!alive || drinkingPet[pet]) return;
    const slot = root.querySelector(`#sv-pet-${pet}`);
    Spil.tone(pet === "kat" ? [620, 780, 680] : [280, 340, 260], 0.08, "triangle");
    showTag(pet, pet === "kat" ? "Miav! 🐱" : "Vov! 🐶");
    Spil.say(
      pet === "kat" ? "Miav! Jeg er tørstig! Bland en sjov sodavand til mig." : "Vov! Må jeg smage en sjov sodavand?",
      null,
      pet === "kat" ? "sv-kat-toerstig" : "sv-hund-toerstig"
    );
    Spil.burstAt(slot, "💖");
    // Hvis der står et glas klar på bordet, lad det hoppe lidt som et venligt vink om at trække det hen til dyret
    if (mix.length > 0 && sipsLeft > 0) {
      const cup = root.querySelector(".sv-cup");
      if (cup && !dragState) {
        cup.classList.remove("nudge");
        void cup.offsetWidth;
        cup.classList.add("nudge");
        later(() => cup.classList.remove("nudge"), 520);
      }
    }
  }

  function drinkFromCup(pet) {
    if (!alive || drinkingPet[pet] || mix.length === 0 || sipsLeft <= 0) return;
    if (Date.now() < sipCooldown[pet]) return;
    const slot = root.querySelector(`#sv-pet-${pet}`);
    const cup = root.querySelector(".sv-cup");

    drinkingPet[pet] = true;
    sipCooldown[pet] = Date.now() + 700;
    const currentMix = [...mix];
    sipsLeft -= 1;
    if (sipsLeft <= 0) {
      mix = [];
      if (dragState && cup) {
        try { cup.releasePointerCapture(dragState.id); } catch (_) {}
        cup.classList.remove("dragging");
        dragState = null;
      }
      if (cup) { cup.style.left = "50%"; cup.style.bottom = ""; cup.style.transform = ""; }
      root.querySelectorAll(".sv-pet").forEach(el => el.classList.remove("drop-over"));
    }

    syncAllUI();
    slot.classList.add("drinking");
    setPose(pet, "drink");
    playGulp();
    later(() => playGulp(), 180);

    later(() => {
      slot.classList.remove("drinking");
      applyMix(pet, currentMix);
      drinkingPet[pet] = false;
      syncAllUI();
    }, 420);
  }

  function applyMix(pet, drinks) {
    const slot = root.querySelector(`#sv-pet-${pet}`);
    clearPetLoops(pet);
    clearPetOverlays(slot);
    const ids = new Set(drinks.map(d => d.id));
    const primary = drinks[drinks.length - 1];

    if (ids.has("giant") || ids.has("tiny")) slot.classList.remove("sv-giant", "sv-tiny", "sv-yoyo");
    if (drinks.some(d => d.motFx)) slot.classList.remove("sv-mot-sour","sv-mot-sugar","sv-mot-spicy","sv-mot-cold","sv-mot-sleepy","sv-mot-float","sv-mot-sovehop");
    if (drinks.some(d => d.colFx) || ids.size >= 3) slot.classList.remove("sv-col-sour","sv-col-pink","sv-col-spicy","sv-col-cold","sv-col-blue","sv-col-green","sv-col-sleepy","sv-rainbow");

    let comboId = null, comboName = null, comboKey = null, comboSay = null, comboTag = null, emitterChars = null;
    const isRb = ids.size >= 3;

    if (ids.has("giant") && ids.has("tiny")) {
      slot.classList.add("sv-yoyo");
      comboId = "jojo"; comboName = "🪀 Jojo-størrelse!"; comboKey = "sv-kombo-jojo";
      comboSay = "Hovsa! Stor, lille, stor, lille!"; comboTag = "JOJO-DYR! 🪀";
    } else if (ids.has("spicy") && ids.has("cold")) {
      slot.classList.add("sv-mot-float");
      comboId = "damp"; comboName = "☁️ Damp-sky!"; comboKey = "sv-kombo-damp";
      comboSay = "Pssssht! Varm chili og kold is laver en damp-sky!"; comboTag = "DAMP-SKY! ☁️💨";
      emitterChars = ["☁️", "💨"];
    } else if (ids.has("sour") && ids.has("sugar")) {
      slot.classList.add("sv-mot-sugar");
      comboId = "sursoed"; comboName = "⚡ Sur-sød Slik-eksplosion!"; comboKey = "sv-kombo-sursoed";
      comboSay = "Uuuuh-wiiii! Sur og sød på samme tid!"; comboTag = "SUR-SØD! 🍋🍬";
      let t = false;
      petTimers[pet].alt = every(() => { t = !t; setPose(pet, t ? "sour" : "happy"); }, 420);
    } else if (ids.has("sugar") && ids.has("sleepy")) {
      slot.classList.add("sv-mot-sovehop", "sv-col-sleepy");
      comboId = "sovehop"; comboName = "💤 Søvnig hoppebold!"; comboKey = "sv-kombo-sovehop";
      comboSay = "Gaaab... boing! Jeg hopper i søvne!"; comboTag = "SOVE-HOP! 💤⚡";
      emitterChars = ["💤", "⭐"];
    } else {
      if (ids.has("giant")) slot.classList.add("sv-giant");
      if (ids.has("tiny"))  slot.classList.add("sv-tiny");
      const lastMot = [...drinks].reverse().find(d => d.motFx);
      if (lastMot) slot.classList.add(lastMot.motFx);
      const lastCol = [...drinks].reverse().find(d => d.colFx);
      if (lastCol) slot.classList.add(lastCol.colFx);
    }

    if (isRb) {
      slot.classList.remove("sv-col-sour","sv-col-pink","sv-col-spicy","sv-col-cold","sv-col-blue","sv-col-green","sv-col-sleepy");
      slot.classList.add("sv-rainbow");
      if (!comboId) {
        comboId = "regnbue"; comboName = "🌈 Regnbue-trylledrik!"; comboKey = "sv-kombo-regnbue";
        comboSay = "Juhuu! En rigtig regnbue-trylledrik!"; comboTag = "REGNBUE-MIX! 🌈";
      }
    }

    if (!petTimers[pet].alt) {
      if (ids.has("spicy") && !ids.has("cold")) setPose(pet, "drink");
      else if (ids.has("sleepy") && !ids.has("sour")) setPose(pet, "sleepy");
      else if (ids.has("sour") || ids.has("cold")) setPose(pet, "sour");
      else setPose(pet, primary.pose);
    }

    if (ids.has("giant") && !ids.has("tiny")) spawnGiantDust(slot);

    if (ids.has("bubbles")) {
      spawnBubble(slot, isRb);
      petTimers[pet].loop = every(() => spawnBubble(slot, isRb), 820);
    } else if (ids.has("spicy") && !ids.has("cold")) {
      spawnFireBreath(slot);
      later(() => {
        if (!slot.classList.contains("sv-mot-spicy")) return;
        setPose(pet, "sour");
        playKettleWhistle();
        spawnEarSteam(slot);
        petTimers[pet].loop = every(() => spawnEarSteam(slot), 820);
      }, 1450);
    } else if (ids.has("cold") && !ids.has("spicy")) {
      spawnIceCube(slot, pet);
      spawnSvgFly(slot, "ice", 6);
    } else if (ids.has("sleepy")) {
      spawnSleepMoon(slot);
      spawnSleepZ(slot);
      petTimers[pet].loop = every(() => spawnSleepZ(slot), 950);
    } else if (ids.has("sour")) {
      spawnSourZigs(slot);
      spawnSvgFly(slot, "sour", 8);
      petTimers[pet].loop = every(() => spawnSvgFly(slot, "sour", 4), 1100);
    } else if (ids.has("sugar")) {
      spawnSvgFly(slot, "sugar", 9);
      petTimers[pet].loop = every(() => spawnSvgFly(slot, "sugar", 5), 900);
    } else if (emitterChars) {
      let k = 0;
      spawnRiser(slot, emitterChars[0]);
      petTimers[pet].loop = every(() => spawnRiser(slot, emitterChars[++k % emitterChars.length]), 720);
    }

    saved.serveret = (saved.serveret || 0) + 1;
    let nyAlle = false;
    if (comboId && !saved.komboer.includes(comboId)) {
      saved.komboer.push(comboId);
      renderStars();
      if (saved.komboer.length === KOMBO_IDS.length) nyAlle = true;
    }
    saveState();

    playSfx(comboId ? "combo" : primary.sfx);
    Spil.burstAt(slot, isRb ? "🌈" : primary.ico);
    showTag(pet, comboTag || (drinks.length > 1 ? `MIX! ${drinks.map(d => d.ico).join("")}` : primary.tag));
    if (comboName) showBanner(comboName);

    if (!saidForDrink || nyAlle) {
      saidForDrink = true;
      const sayKey = nyAlle ? [comboKey, "sv-alle-kombo"] : (comboKey || primary.key);
      const sayTxt = nyAlle ? `${comboSay} Fantastisk! Du har fundet alle de hemmelige blandinger!` : (comboSay || primary.say);
      Spil.say(sayTxt, null, sayKey);
    }

    const varighed = ids.has("bubbles") ? 8200 : 6500;
    petTimers[pet].calm = later(() => calmPet(pet), varighed);
  }

  function resetPets() {
    if (!alive) return;
    drinkingPet.kat = false; drinkingPet.hund = false;
    root.querySelector(".sv-banner").classList.remove("show");
    ["kat", "hund"].forEach(pet => {
      clearPetLoops(pet);
      const slot = root.querySelector(`#sv-pet-${pet}`);
      clearPetOverlays(slot);
      slot.className = "sv-pet";
      setPose(pet, "idle");
      showTag(pet, "Frisk igen! 💧");
    });
    Spil.tone([440, 554, 659], 0.08, "sine");
    Spil.say("Ahhh! Dejligt, frisk vand!", null, "sv-vand");
    syncAllUI();
  }

  /* Træk glasset tæt på katten eller hunden — de drikker automatisk når det kommer tæt på! */
  function petAtPoint(x, y) {
    for (const pet of ["kat", "hund"]) {
      const el = root.querySelector(`#sv-pet-${pet}`);
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return pet;
    }
    return null;
  }

  function onCupDown(e) {
    if (!alive || mix.length === 0 || sipsLeft <= 0) return;
    const cup = root.querySelector(".sv-cup");
    const sr = root.querySelector(".sv-cafe").getBoundingClientRect();
    cup.setPointerCapture(e.pointerId);
    cup.classList.remove("ready", "nudge");
    cup.classList.add("dragging");
    dragState = { id: e.pointerId, sr, lastFed: null };
    moveCup(e);
  }
  function moveCup(e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    const cup = root.querySelector(".sv-cup");
    const sr = dragState.sr;
    const hit = petAtPoint(e.clientX, e.clientY);

    const tilt = hit === "kat" ? -24 : hit === "hund" ? 24 : 0;
    cup.style.left = (e.clientX - sr.left) + "px";
    cup.style.bottom = (sr.bottom - e.clientY - 40) + "px";
    cup.style.transform = `translateX(-50%) rotate(${tilt}deg) scale(1.06)`;

    ["kat", "hund"].forEach(pet => {
      root.querySelector(`#sv-pet-${pet}`).classList.toggle("drop-over", pet === hit);
    });

    if (!hit) {
      dragState.lastFed = null;
    } else if (hit !== dragState.lastFed && !drinkingPet[hit] && sipsLeft > 0) {
      dragState.lastFed = hit;
      drinkFromCup(hit);
    }
  }
  function onCupUp(e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    const cup = root.querySelector(".sv-cup");
    try { cup.releasePointerCapture(e.pointerId); } catch (_) {}
    cup.classList.remove("dragging");
    dragState = null;

    ["kat", "hund"].forEach(pet => root.querySelector(`#sv-pet-${pet}`).classList.remove("drop-over"));
    cup.style.left = "50%"; cup.style.bottom = ""; cup.style.transform = "";
    syncAllUI();
  }

  /* ==================== BYG HYLDE (1 RÆKKE PÅ IPAD, 2 RÆKKER PÅ TELEFON) ==================== */
  function buildShelves() {
    const wrap = root.querySelector(".sv-shelves");
    wrap.innerHTML = "";
    const narrow = window.innerWidth <= 720;
    const groups = narrow ? [DRINKS.slice(0, 4), DRINKS.slice(4, 8)] : [DRINKS];
    groups.forEach(group => {
      const row = document.createElement("div");
      row.className = "sv-shelf";
      group.forEach(d => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sv-bottle";
        b.setAttribute("aria-label", d.label);
        b.dataset.drink = d.id;
        b.innerHTML = `<span class="sv-label">${d.label}</span><img src="${STI}flaske-${d.id}.webp" alt="" draggable="false">`;
        b.onclick = () => pourFromBottle(d, b);
        row.appendChild(b);
      });
      wrap.appendChild(row);
    });
  }

  let onResize;

  Spil.register({
    id: "sodavand",
    navn: "Sodavand",
    ikon: "🥤",
    farve: "#ffe4b5",
    start(r) {
      Spil.preload(ALL_KEYS);
      ["bg-vaerksted.webp?v=4k", "bg-cafe.webp?v=4k"].forEach(f => { const i = new Image(); i.src = `${STI}${f}`; });
      DRINKS.forEach(d => { const i = new Image(); i.src = `${STI}flaske-${d.id}.webp`; });
      MACHINES.forEach(m => { const i = new Image(); i.src = `${STI}maskine-${m.id}.webp`; });
      ["kat", "hund"].forEach(p => ["idle","drink","sour","happy","sleepy"].forEach(m => { const i = new Image(); i.src = `${STI}${p}-${m}.webp`; }));

      alive = true; timers = []; intervals = []; mix = []; mixMethod = null; sipsLeft = 0; saidForDrink = false; pouring = false; mixing = false; dragState = null;
      drinkingPet.kat = false; drinkingPet.hund = false;
      sipCooldown.kat = 0; sipCooldown.hund = 0;
      scene = "lab"; saidMixerIntro = false; saidCafeIntro = false;
      saved = loadSaved();

      r.innerHTML = `
        <div class="sv">
          <div class="sv-top">
            <div class="sv-stars" aria-label="Hemmelige blandinger"></div>
            <button class="sv-pill sv-btn-back" type="button" hidden aria-label="Tilbage til hylden">🧪 Hylde</button>
            <button class="sv-pill sv-btn-reset" type="button" hidden aria-label="Giv frisk vand">💧 Vand</button>
          </div>

          <!-- SCENE 1: BLANDEBORDET -->
          <div class="sv-view sv-lab">
            <div class="sv-shelves"></div>
            <div class="sv-counter">
              <button class="sv-rinse hide" type="button" aria-label="Tøm glasset">💧</button>
              <div class="sv-lab-cup">${cupSvgMarkup("svl")}</div>
              <button class="sv-serve sv-to-mixer hide" type="button" aria-label="Videre til mikseren">
                <img src="${STI}maskine-blender.webp" alt="">
                <span class="arr">➜</span>
              </button>
            </div>
          </div>

          <!-- SCENE 2: MIKSER-BORDET (4 KØKKENMASKINER) -->
          <div class="sv-view sv-mixer out-right">
            <div class="sv-machines">
              ${MACHINES.map(m => `
                <button class="sv-machine" type="button" data-machine="${m.id}" aria-label="${m.label}">
                  <span class="sv-label">${m.label}</span>
                  <img src="${STI}maskine-${m.id}.webp" alt="" draggable="false">
                </button>
              `).join("")}
            </div>
            <div class="sv-counter">
              <div class="sv-mix-cup">
                <div class="sv-mix-tag"></div>
                ${cupSvgMarkup("svm")}
              </div>
              <button class="sv-serve sv-serve-cafe" type="button" aria-label="Servér for katten og hunden">
                <img src="${STI}kat-idle.webp" alt="">
                <img src="${STI}hund-idle.webp" alt="">
                <span class="arr">➜</span>
              </button>
            </div>
          </div>

          <!-- SCENE 3: CAFÉ-BORDET -->
          <div class="sv-view sv-cafe out-right">
            <div class="sv-banner"></div>
            <div class="sv-row">
              <div class="sv-pet" id="sv-pet-kat" data-pet="kat" role="button" aria-label="Kat">
                <div class="sv-tag" id="sv-tag-kat"></div>
                <div class="sv-shadow"></div>
                <div class="sv-motion"><img class="sv-img" id="sv-img-kat" src="${STI}kat-idle.webp" alt="Kat" draggable="false"></div>
              </div>
              <div class="sv-pet" id="sv-pet-hund" data-pet="hund" role="button" aria-label="Hund">
                <div class="sv-tag" id="sv-tag-hund"></div>
                <div class="sv-shadow"></div>
                <div class="sv-motion"><img class="sv-img" id="sv-img-hund" src="${STI}hund-idle.webp" alt="Hund" draggable="false"></div>
              </div>
            </div>
            <div class="sv-cup empty" aria-label="Sodavandsglas">${cupSvgMarkup("svc")}</div>
            <button class="sv-new-drink" type="button" aria-label="Bland ny drink">🥤 Ny drink!</button>
            <div class="sv-fx"></div>
          </div>
        </div>
      `;
      root = r.querySelector(".sv");
      renderStars();
      buildShelves();

      let lastNarrow = window.innerWidth <= 720;
      onResize = () => {
        const nowNarrow = window.innerWidth <= 720;
        if (nowNarrow !== lastNarrow) { lastNarrow = nowNarrow; buildShelves(); }
      };
      window.addEventListener("resize", onResize);

      root.querySelector(".sv-rinse").onclick = () => {
        if (pouring) return;
        mix = []; mixMethod = null; sipsLeft = 0;
        Spil.tone([440, 330], 0.08, "sine");
        syncAllUI();
      };
      root.querySelector(".sv-to-mixer").onclick = () => {
        if (pouring || mix.length === 0) return;
        Spil.sfx.click();
        root.querySelectorAll(".sv-machine").forEach(b => b.classList.remove("picked"));
        goScene("mixer");
      };
      root.querySelectorAll(".sv-machine").forEach(btn => {
        const m = MACHINES.find(x => x.id === btn.dataset.machine);
        btn.onclick = () => runMachine(m, btn);
      });
      root.querySelector(".sv-serve-cafe").onclick = () => {
        if (mixing || mix.length === 0) return;
        sipsLeft = MAX_SIPS; saidForDrink = false;
        Spil.sfx.click();
        goScene("cafe");
      };
      root.querySelector(".sv-btn-back").onclick = () => { Spil.sfx.click(); goScene("lab"); };
      root.querySelector(".sv-new-drink").onclick = () => { Spil.sfx.click(); goScene("lab"); };
      root.querySelector(".sv-btn-reset").onclick = resetPets;

      root.querySelector("#sv-pet-kat").onclick = () => onPetTap("kat");
      root.querySelector("#sv-pet-hund").onclick = () => onPetTap("hund");

      const cup = root.querySelector(".sv-cup");
      cup.addEventListener("pointerdown", onCupDown);
      cup.addEventListener("pointermove", moveCup);
      cup.addEventListener("pointerup", onCupUp);
      cup.addEventListener("pointercancel", onCupUp);

      if (Spil.dyb === "mikser") {
        mix = [DRINKS[0], DRINKS[1]];
        sipsLeft = MAX_SIPS; saidForDrink = false;
        goScene("mixer");
      } else if (Spil.dyb === "cafe") {
        mix = [DRINKS[0], DRINKS[1]];
        sipsLeft = MAX_SIPS; saidForDrink = false;
        goScene("cafe");
      } else {
        goScene("lab");
        later(() => Spil.say("Hej! Tryk på flaskerne på hylden og bland din egen sjove sodavand!", null, "sv-hej"), 350);
      }
    },
    stop() {
      alive = false;
      closeStation();
      if (onResize) { window.removeEventListener("resize", onResize); onResize = null; }
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      clearPetLoops("kat"); clearPetLoops("hund");
      timers = []; intervals = []; dragState = null;
    }
  });
})();
