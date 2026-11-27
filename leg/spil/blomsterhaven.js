// Spil: Blomsterhaven — plant frø, vand, giv solskin, børst blade, få besøg af sommerfugle og bind buketter til dyrene.
// Kombinerer pleje med værktøjer (som Dyrlægen), levende have der husker alt (som Akvariet) og kreativ buket-binding (som Drejeskiven).
// Ingen tabe-tilstand: planter dør aldrig, og alle buketter modtages med glæde!
(function () {
  const GEM = "lk-blomsterhaven";
  const IMG = "billeder/blomsterhaven/";
  const ROS = ["ros-0", "ros-1", "ros-2", "ros-3", "ros-4"];
  const roligt = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

  const SORTER = [
    { id: "solsikke",   navn: "Solsikke",     farve: "#ffd23f", ikon: "🌻", krav: 0 },
    { id: "tulipan",    navn: "Tulipan",      farve: "#ff8fa3", ikon: "🌷", krav: 0 },
    { id: "rose",       navn: "Rose",         farve: "#e85d56", ikon: "🌹", krav: 0 },
    { id: "blaaklokke", navn: "Blåklokke",    farve: "#7cc8f2", ikon: "🪻", krav: 0 },
    { id: "marguerit",  navn: "Marguerit",    farve: "#fff6cc", ikon: "🌼", krav: 0 },
    { id: "regnbue",    navn: "Regnbueblomst", farve: "#f59ac8", ikon: "🌈", krav: 2 },
  ];
  const SORT_MAP = Object.fromEntries(SORTER.map(s => [s.id, s]));

  const KUNDER = [
    { id: "kanin",    navn: "Kaninen",   key: "bh-kunde-kanin",    tekst: "Hej! Kaninen ønsker sig en fin blomsterbuket!" },
    { id: "pindsvin", navn: "Pindsvinet", key: "bh-kunde-pindsvin", tekst: "Hej! Pindsvinet ønsker sig en fin blomsterbuket!" },
    { id: "bjoern",   navn: "Bjørnen",   key: "bh-kunde-bjoern",   tekst: "Hej! Bjørnen ønsker sig en fin blomsterbuket!" },
  ];

  const SLOEJFER = [
    { id: "roed",     farve: "#ff6b6b", kant: "#b83b3b" },
    { id: "gul",      farve: "#ffd23f", kant: "#b88a00" },
    { id: "blaa",     farve: "#6ec1f2", kant: "#2b78a8" },
    { id: "lyseroed", farve: "#ff9ec7", kant: "#b84e7d" },
    { id: "lilla",    farve: "#b89cf2", kant: "#6b4fa8" },
  ];

  const VAERKTOEJ = [
    { id: "froe",    ikon: "🌱", navn: "Plant frø" },
    { id: "vand",    ikon: "💧", navn: "Vandkande" },
    { id: "sol",     ikon: "☀️", navn: "Solskin" },
    { id: "boerste", ikon: "🐞", navn: "Børst blade" },
    { id: "buket",   ikon: "💐", navn: "Pluk buket" },
  ];

  Spil.css("css-blomsterhaven", `
    .bh{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;
      background:#a7dc7c;font-family:var(--display,system-ui);user-select:none;-webkit-user-select:none}
    .bh-bg-dag,.bh-bg-nat{position:absolute;inset:0;background-size:cover;background-position:center 46%;pointer-events:none;transition:opacity .9s ease}
    .bh-bg-dag{background-image:url("${IMG}baggrund-dag.webp");opacity:1}
    .bh-bg-nat{background-image:url("${IMG}baggrund-nat.webp");opacity:0}
    .bh.nat .bh-bg-nat{opacity:1}

    /* Blidt stjerneglimt om natten oven på nat-baggrunden */
    .bh-himmel{position:absolute;inset:0 0 42% 0;pointer-events:none;overflow:hidden}
    .bh-stjerner{position:absolute;inset:0;opacity:0;transition:opacity .9s}
    .bh.nat .bh-stjerner{opacity:.85}
    .bh-stj-prik{position:absolute;width:4px;height:4px;border-radius:50%;background:#fff8cc;box-shadow:0 0 8px #fff5aa;animation:bh-glimt 2.8s ease-in-out infinite}

    /* Øverste bar: buket-tæller + dag/nat knap */
    .bh-top{position:absolute;top:calc(2vh + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
      z-index:16;display:flex;align-items:center;gap:10px}
    .bh-taeller{padding:8px 16px;border-radius:40px;background:rgba(255,252,242,.88);box-shadow:0 4px 0 rgba(61,43,61,.2);
      font:800 clamp(20px,3.4vh,30px)/1.1 var(--display,system-ui);color:#6e4326;display:flex;align-items:center;gap:6px}
    .bh-taeller.pop{animation:bh-pop .5s ease-out}
    .bh-nat-knap{width:clamp(54px,7.6vh,68px);aspect-ratio:1;border-radius:50%;background:rgba(255,252,242,.88);
      box-shadow:0 4px 0 rgba(61,43,61,.2);font-size:clamp(26px,4vh,34px);line-height:1;padding:0;
      font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center}
    .bh-nat-knap:active{transform:translateY(3px)}

    /* Baggrund: havehegn, pynt og besøgende dyr */
    .bh-scene{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end}
    .bh-hegn{position:absolute;left:0;right:0;bottom:44%;height:16%;pointer-events:none;
      background:repeating-linear-gradient(90deg,#e9d5b8 0 26px,#d4b690 26px 28px,transparent 28px 46px);
      opacity:.9;border-top:5px solid #d4b690;border-bottom:5px solid #c4a076}
    .bh.nat .bh-hegn{filter:brightness(.58) saturate(.8)}
    /* Lyskæde i blød bue mellem æbletræerne (låses op efter 4 buketter) */
    .bh-lyskaede{position:absolute;left:12%;right:12%;top:8%;height:14%;pointer-events:none;opacity:0;transition:opacity .6s;z-index:2}
    .bh-lyskaede.vis{opacity:1}
    .bh-lyskaede svg{width:100%;height:100%;overflow:visible;display:block}
    .bh-paere{animation:bh-glimt 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    .bh.nat .bh-paere-gloed{opacity:.95}

    /* Havepynt (låses op efter 1, 2, 3 buketter) — forankret på græsset bag bænken med skygge, dag/nat-lys og klik-reaktion */
    .bh-pynt{position:absolute;pointer-events:auto;cursor:pointer;bottom:34%;z-index:3;
      transform-origin:bottom center;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .5s}
    .bh-pynt::before{content:"";position:absolute;left:12%;right:12%;bottom:-4px;height:14px;border-radius:50%;
      background:radial-gradient(ellipse,rgba(35,55,25,.42) 0%,rgba(35,55,25,0) 72%);z-index:-1;pointer-events:none}
    .bh-pynt img{display:block;height:clamp(92px,17vh,160px);width:auto;
      filter:drop-shadow(0 3px 4px rgba(45,30,45,.18));transition:filter .8s ease}
    .bh.nat .bh-pynt img{filter:brightness(.72) contrast(1.06) saturate(.88) drop-shadow(0 3px 6px rgba(10,15,35,.45))}
    .bh.nat .bh-pynt.lygte img{filter:brightness(.88) saturate(1.1) drop-shadow(0 0 12px rgba(255,220,110,.55))}
    .bh-pynt[hidden]{display:none}
    .bh-pynt:active{transform:scale(.95)}
    .bh-pynt.hop img{animation:bh-hop .42s ease-in-out 2}
    .bh-pynt.vrik img{animation:bh-vrik .5s ease-in-out}
    .bh-pynt.svampehus{left:max(22px,4.5vw)}
    /* Varmt vindueslys i svampehuset om natten */
    .bh-pynt.svampehus::after{content:"";position:absolute;left:50%;bottom:24%;width:42%;height:34%;transform:translateX(-50%);
      border-radius:50%;background:radial-gradient(circle,rgba(255,230,120,.82) 0%,rgba(255,195,80,.35) 45%,rgba(255,195,80,0) 74%);
      opacity:0;transition:opacity .8s ease;pointer-events:none;mix-blend-mode:screen}
    .bh.nat .bh-pynt.svampehus::after{opacity:1}
    .bh-pynt.fuglebad{right:max(22px,4.5vw)}
    .bh-pynt.lygte{left:20%;bottom:35%}
    .bh-pynt.lygte::after{content:"";position:absolute;left:50%;top:28%;width:110px;height:110px;transform:translate(-50%,-50%);
      border-radius:50%;background:radial-gradient(circle,rgba(255,238,145,.88) 0%,rgba(255,210,85,.35) 45%,rgba(255,210,85,0) 72%);
      opacity:.18;transition:opacity .7s ease,transform .5s ease;pointer-events:none}
    .bh.nat .bh-pynt.lygte::after,.bh-pynt.lygte.taendt::after{opacity:1;transform:translate(-50%,-50%) scale(1.38)}

    /* Besøgende dyr ved havelågen */
    .bh-kunde{position:absolute;left:50%;bottom:35%;transform:translateX(-50%);z-index:4;
      display:flex;align-items:flex-end;gap:10px;cursor:pointer;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .4s}
    .bh-kunde::before{content:"";position:absolute;left:10px;bottom:-4px;width:clamp(80px,13vh,120px);height:14px;border-radius:50%;
      background:radial-gradient(ellipse,rgba(35,55,25,.38) 0%,rgba(35,55,25,0) 72%);z-index:-1;pointer-events:none}
    .bh.nat .bh-kunde-dyr{filter:brightness(.82) saturate(.92) drop-shadow(0 4px 6px rgba(10,15,35,.4))}
    .bh-kunde.skjult{opacity:0;transform:translateX(-50%) translateY(30px) scale(.85);pointer-events:none}
    .bh-kunde-dyr{height:clamp(108px,19vh,175px);width:auto;display:block;filter:drop-shadow(0 6px 8px rgba(45,30,45,.22));
      animation:bh-nik 3.2s ease-in-out infinite}
    .bh-kunde.glad .bh-kunde-dyr{animation:bh-hop .45s ease-in-out 4}
    .bh-oenske{position:relative;margin-bottom:clamp(42px,8vh,74px);padding:8px 12px;border-radius:26px;
      background:rgba(255,253,246,.96);border:3px solid #4a354a;box-shadow:0 5px 0 rgba(61,43,61,.2);
      display:flex;align-items:center;gap:6px;min-height:54px}
    .bh-oenske::before{content:"";position:absolute;left:-10px;bottom:14px;width:14px;height:14px;border-radius:50%;
      background:#fffdf6;border:3px solid #4a354a}
    .bh-oenske-slot{width:clamp(40px,6.2vh,54px);height:clamp(40px,6.2vh,54px);border-radius:50%;
      background:#fff5db;border:2px dashed #d4b27a;display:flex;align-items:center;justify-content:center;position:relative}
    .bh-oenske-slot.har{background:#dff7d4;border:2px solid #59a84f}
    .bh-oenske-slot img{width:82%;height:82%;object-fit:contain;display:block}
    .bh-oenske-slot.har::after{content:"✓";position:absolute;right:-4px;bottom:-4px;width:20px;height:20px;border-radius:50%;
      background:#59a84f;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}

    /* Flyvende sommerfugle, bier og mariehøns */
    .bh-dyr-lag{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden}
    .bh-kryb{position:absolute;width:clamp(48px,7.5vh,70px);height:clamp(48px,7.5vh,70px);
      pointer-events:auto;cursor:pointer;transition:transform .25s ease-out;will-change:transform}
    .bh-kryb img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 4px 4px rgba(45,30,45,.2));
      animation:bh-flaks .55s ease-in-out infinite alternate}
    .bh-kryb.snur img{animation:bh-snur .65s ease-out}

    /* Blomsterbænk og 6 urtepotter */
    .bh-baenk-wrap{position:relative;z-index:6;padding:0 max(12px,env(safe-area-inset-left,0px)) 8px max(12px,env(safe-area-inset-right,0px))}
    .bh-baenk{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(8px,1.4vw,18px);
      padding:10px 14px 12px;border-radius:28px 28px 18px 18px;
      background:linear-gradient(180deg,#d8a878 0%,#c48e5d 52%,#a77346 100%);
      box-shadow:0 8px 0 #7f5330,0 12px 24px rgba(45,30,45,.22);border:3px solid #6b4325}
    .bh-potte{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
      height:clamp(145px,24vh,215px);cursor:pointer;touch-action:manipulation;border-radius:20px;padding:4px;
      transition:transform .16s ease-out}
    .bh-potte:active{transform:scale(.95)}
    .bh-potte.klar-pluk::before{content:"";position:absolute;inset:4px;border-radius:20px;
      box-shadow:0 0 0 4px #ffd23f,0 0 18px rgba(255,210,63,.7);animation:bh-puls 1.4s ease-in-out infinite;pointer-events:none}
    .bh-plante-wrap{position:relative;width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;margin-bottom:-12px;z-index:2}
    .bh-plante{max-height:clamp(95px,16.5vh,148px);max-width:96%;width:auto;object-fit:contain;display:block;
      transform-origin:bottom center;filter:drop-shadow(0 4px 5px rgba(45,30,45,.22));animation:bh-svaj 3.4s ease-in-out infinite}
    .bh-plante.voks{animation:bh-voks .55s cubic-bezier(.34,1.56,.64,1)}
    .bh-plante.spire{max-height:clamp(44px,7.5vh,68px)}
    .bh-plante.knop{max-height:clamp(74px,12.5vh,112px)}
    .bh-pottesk{position:relative;width:clamp(72px,10vw,108px);height:clamp(48px,7.4vh,64px);z-index:1;
      background:linear-gradient(180deg,#e07b54 0%,#c7613d 100%);
      border-radius:8px 8px 22px 22px;border:3px solid #5a3426;box-shadow:0 4px 0 rgba(61,43,61,.25)}
    .bh-pottesk::before{content:"";position:absolute;left:-7px;right:-7px;top:-10px;height:16px;border-radius:9px;
      background:linear-gradient(180deg,#eb8b63,#d36d47);border:3px solid #5a3426}
    .bh-jord{position:absolute;left:4px;right:4px;top:-6px;height:10px;border-radius:50%;background:#66422c}

    /* Behov-boble over potten + støv/kilde-prikker */
    .bh-behov{position:absolute;top:2px;right:4px;z-index:4;width:clamp(38px,5.6vh,48px);height:clamp(38px,5.6vh,48px);
      border-radius:50%;background:#fffdf6;border:3px solid #4a354a;box-shadow:0 3px 0 rgba(61,43,61,.22);padding:0;
      font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif;line-height:1;
      display:flex;align-items:center;justify-content:center;font-size:clamp(20px,3.2vh,26px);
      animation:bh-svaev 1.8s ease-in-out infinite;pointer-events:none}
    .bh-behov[hidden]{display:none}
    .bh-stoev{position:absolute;inset:12% 16% 32% 16%;pointer-events:none;z-index:3}
    .bh-stoev span{position:absolute;width:10px;height:10px;border-radius:50%;background:#a89078;border:2px solid #5a4638;
      animation:bh-svaev 1.2s ease-in-out infinite}

    /* Vanddråber / solstråler ved brug af værktøj */
    .bh-effekt{position:fixed;pointer-events:none;z-index:25;font-size:30px;animation:bh-fald .75s ease-out forwards}

    /* Frø-bakke (åbnes når frøpose er valgt) */
    .bh-froe-bakke{position:relative;z-index:11;display:flex;justify-content:center;gap:10px;padding:6px 12px 2px;flex-wrap:wrap}
    .bh-froe-bakke[hidden]{display:none}
    .bh-froe-knap{width:clamp(60px,8.5vh,76px);height:clamp(60px,8.5vh,76px);border-radius:20px;box-sizing:border-box;
      background:#fffdf6;border:3px solid #4a354a;box-shadow:0 4px 0 rgba(61,43,61,.22);
      display:flex;align-items:center;justify-content:center;padding:5px;position:relative;transition:transform .14s}
    .bh-froe-knap img{width:100%;height:100%;object-fit:contain;display:block}
    .bh-froe-knap.valgt{background:#fff2b3;box-shadow:0 0 0 4px #ffd23f,0 4px 0 rgba(61,43,61,.22);transform:translateY(-5px) scale(1.06)}
    .bh-froe-knap.laast{opacity:.38;filter:grayscale(1);pointer-events:none}
    .bh-froe-knap.laast::after{content:"🔒";position:absolute;font-size:20px}

    /* Værktøjslinje i bunden */
    .bh-dock{position:relative;z-index:12;display:flex;justify-content:center;align-items:center;gap:clamp(10px,2vw,20px);
      padding:8px max(12px,env(safe-area-inset-left,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-right,0px));
      background:linear-gradient(180deg,rgba(255,250,238,0),rgba(255,250,238,.85) 35%)}
    .bh.nat .bh-dock{background:linear-gradient(180deg,rgba(30,42,90,0),rgba(30,42,90,.75) 35%)}
    .bh-tool{width:clamp(66px,10vh,86px);height:clamp(66px,10vh,86px);border-radius:50%;padding:0;box-sizing:border-box;
      background:#fffdf6;border:3px solid #4a354a;box-shadow:0 5px 0 rgba(61,43,61,.25);
      font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center;font-size:clamp(32px,5vh,44px);line-height:1;
      position:relative;transition:transform .15s,background .2s}
    .bh-tool:active{transform:translateY(3px)}
    .bh-tool.valgt{background:#fff0a8;transform:translateY(-8px) scale(1.09);box-shadow:0 0 0 4px #ffd23f,0 8px 0 rgba(61,43,61,.25)}
    .bh-tool.klar{animation:bh-puls 1.4s ease-in-out infinite}
    .bh-tool-badge{position:absolute;top:-5px;right:-5px;min-width:26px;height:26px;padding:0 5px;border-radius:999px;
      background:#ff6b6b;color:#fff;font:800 15px/26px var(--display,system-ui);text-align:center;box-shadow:0 2px 0 rgba(61,43,61,.3)}
    .bh-tool-badge[hidden]{display:none}

    /* Buket-værksted overlay (vælg sløjfe og giv til dyret!) */
    .bh-buket-lag{position:absolute;inset:0;z-index:18;background:rgba(45,35,60,.42);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;padding:16px}
    .bh-buket-lag[hidden]{display:none}
    .bh-buket-kort{width:min(480px,92vw);border-radius:36px;background:#fffdf6;border:4px solid #4a354a;
      box-shadow:0 12px 0 rgba(61,43,61,.28);padding:22px 20px;display:flex;flex-direction:column;align-items:center;gap:16px}
    .bh-buket-vis{position:relative;width:230px;height:210px;display:flex;align-items:flex-end;justify-content:center}
    .bh-buket-blomst{position:absolute;bottom:48px;height:145px;width:auto;object-fit:contain;transform-origin:bottom center;
      filter:drop-shadow(0 4px 5px rgba(45,30,45,.2))}
    .bh-buket-papir{position:relative;z-index:3;width:118px;height:96px;border-radius:10px 10px 46px 46px;
      background:linear-gradient(135deg,#f7e3c4,#e7c496);border:3px solid #6b4325;
      clip-path:polygon(0 0,100% 0,78% 100%,22% 100%)}
    .bh-buket-sloejfe{position:absolute;bottom:44px;left:50%;transform:translateX(-50%);z-index:4;
      width:74px;height:36px;display:flex;align-items:center;justify-content:center}
    .bh-sloejfe-oere{width:30px;height:24px;border-radius:50%;border:3px solid var(--sk,#b83b3b);background:var(--sf,#ff6b6b)}
    .bh-sloejfe-knude{width:18px;height:18px;border-radius:50%;border:3px solid var(--sk,#b83b3b);background:var(--sf,#ff6b6b);margin:0 -8px;z-index:2}
    .bh-sloejfe-raekke{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .bh-sloejfe-knap{width:62px;height:62px;border-radius:50%;border:4px solid #4a354a;box-shadow:0 4px 0 rgba(61,43,61,.22);
      transition:transform .14s}
    .bh-sloejfe-knap.valgt{transform:scale(1.15);box-shadow:0 0 0 4px #ffd23f,0 4px 0 rgba(61,43,61,.22)}
    .bh-giv-knap{padding:14px 34px;border-radius:999px;background:#7ed957;border:3px solid #3d6b2b;
      box-shadow:0 6px 0 #3d6b2b;font-size:34px;line-height:1;display:flex;align-items:center;gap:10px;
      animation:bh-puls 1.3s ease-in-out infinite}
    .bh-giv-knap:active{transform:translateY(4px);box-shadow:0 2px 0 #3d6b2b}

    /* Telefon (smal skærm): 3x2 potter, kompakte knapper uden vandret scroll */
    @media (max-width:680px){
      .bh-himmel-lys{left:36%;width:56px;height:56px}
      .bh-baenk{grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 10px 10px}
      .bh-potte{height:clamp(108px,16.5vh,140px)}
      .bh-plante{max-height:clamp(68px,11vh,94px)}
      .bh-plante.spire{max-height:38px}
      .bh-plante.knop{max-height:60px}
      .bh-pottesk{width:68px;height:40px}
      .bh-hegn{bottom:54%;height:11%}
      .bh-lyskaede{bottom:64%}
      .bh-pynt{bottom:47%}
      .bh-pynt img{height:clamp(60px,10.5vh,86px)}
      .bh-pynt.svampehus{left:4px}
      .bh-pynt.lygte{left:20%;bottom:48%}
      .bh-pynt.fuglebad{right:4px}
      .bh-kunde{bottom:48%}
      .bh-kunde-dyr{height:clamp(80px,13vh,112px)}
      .bh-oenske{margin-bottom:32px;padding:6px 9px}
      .bh-oenske-slot{width:34px;height:34px}
      .bh-tool{width:60px;height:60px;font-size:30px}
      .bh-froe-bakke{gap:6px;padding:4px 8px 2px}
      .bh-froe-knap{width:50px;height:50px;border-radius:16px}
    }

    @keyframes bh-svaj{0%,100%{transform:rotate(-2.2deg)}50%{transform:rotate(2.2deg)}}
    @keyframes bh-voks{0%{transform:scale(.25)}65%{transform:scale(1.16)}100%{transform:scale(1)}}
    @keyframes bh-svaev{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes bh-puls{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
    @keyframes bh-pop{40%{transform:scale(1.28)}}
    @keyframes bh-nik{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-5px) rotate(1.5deg)}}
    @keyframes bh-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
    @keyframes bh-vrik{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg) scale(1.06)}75%{transform:rotate(8deg) scale(1.06)}}
    @keyframes bh-flaks{0%{transform:scaleY(1) rotate(-4deg)}100%{transform:scaleY(.86) rotate(4deg)}}
    @keyframes bh-snur{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.25)}100%{transform:rotate(360deg) scale(1)}}
    @keyframes bh-glimt{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
    @keyframes bh-sky-driv{0%{transform:translateX(-160px)}100%{transform:translateX(calc(100vw + 180px))}}
    @keyframes bh-fald{0%{opacity:1;transform:translate(-50%,-50%) scale(.8)}100%{opacity:0;transform:translate(-50%,36px) scale(1.25)}}
    @media (prefers-reduced-motion:reduce){
      .bh-sky,.bh-stj-prik,.bh-paere,.bh-kunde-dyr,.bh-plante,.bh-behov,.bh-kryb img,.bh-tool.klar,.bh-potte.klar-pluk::before,.bh-giv-knap{animation:none}
    }
  `);

  let root, alive, timers, raf;
  let tilstand, valgtTool, valgtFroe, valgtSloejfe, buketKurv, kunde, kryb = [], sagt = {};
  const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
  const $ = s => root && root.querySelector(s);

  function standardTilstand() {
    return {
      potter: [
        { sort: "solsikke", trin: 3, behov: null },
        { sort: "tulipan",  trin: 2, behov: "sol" },
        { sort: "rose",     trin: 1, behov: "vand" },
        { sort: null,       trin: 0, behov: "froe" },
        { sort: null,       trin: 0, behov: "froe" },
        { sort: null,       trin: 0, behov: "froe" },
      ],
      buketter: 0,
      nat: false,
    };
  }

  function indlaes() {
    try {
      const raa = JSON.parse(localStorage.getItem(GEM));
      if (raa && Array.isArray(raa.potter) && raa.potter.length === 6) {
        return { potter: raa.potter, buketter: raa.buketter || 0, nat: !!raa.nat };
      }
    } catch (e) {}
    return standardTilstand();
  }

  function gem() {
    try { localStorage.setItem(GEM, JSON.stringify(tilstand)); } catch (e) {}
  }

  /* ---------- Blide have-lyde (Web Audio) ---------- */
  function haveLyd(type) {
    try {
      const ac = Spil.audio(), nu = ac.currentTime;
      if (type === "vand") {
        // Blød rislen af vanddråber
        for (let i = 0; i < 6; i++) {
          const o = ac.createOscillator(), g = ac.createGain(), t0 = nu + i * .055;
          o.type = "sine"; o.frequency.setValueAtTime(520 + i * 70 + Math.random() * 60, t0);
          o.frequency.exponentialRampToValueAtTime(980 + i * 90, t0 + .08);
          g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.09, t0 + .015);
          g.gain.exponentialRampToValueAtTime(.0001, t0 + .09);
          o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + .1);
        }
      } else if (type === "sol") {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          const o = ac.createOscillator(), g = ac.createGain(), t0 = nu + i * .065;
          o.type = "triangle"; o.frequency.value = f;
          g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.11, t0 + .02);
          g.gain.exponentialRampToValueAtTime(.0001, t0 + .42);
          o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + .45);
        });
      } else if (type === "boerste") {
        for (let i = 0; i < 4; i++) {
          const o = ac.createOscillator(), g = ac.createGain(), t0 = nu + i * .07;
          o.type = "sine"; o.frequency.setValueAtTime(700 + (i % 2) * 260, t0);
          g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.08, t0 + .01);
          g.gain.exponentialRampToValueAtTime(.0001, t0 + .07);
          o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + .08);
        }
      } else if (type === "plant") {
        Spil.tone([330, 440, 523.25], .08, "sine");
      } else if (type === "pluk") {
        Spil.tone([587.33, 880], .07, "sine");
      } else if (type === "kryb") {
        Spil.tone([880, 1174.66, 1318.5], .06, "sine");
      } else if (type === "fugl") {
        // Sød dobbelt fugle-pip
        for (const t0 of [nu, nu + .15]) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = "sine"; o.frequency.setValueAtTime(1450, t0);
          o.frequency.exponentialRampToValueAtTime(2200, t0 + .06);
          o.frequency.exponentialRampToValueAtTime(1750, t0 + .12);
          g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.11, t0 + .015);
          g.gain.exponentialRampToValueAtTime(.0001, t0 + .13);
          o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + .14);
        }
      } else if (type === "svamp") {
        Spil.tone([659.25, 880, 1046.5, 1318.5], .07, "triangle");
      } else if (type === "lygte") {
        Spil.tone([523.25, 783.99, 1046.5], .08, "sine");
      }
    } catch (e) {}
  }

  function visEffekt(el, tegn) {
    if (!el || roligt()) return;
    const b = el.getBoundingClientRect();
    for (let i = 0; i < 4; i++) {
      const d = document.createElement("div");
      d.className = "bh-effekt";
      d.textContent = tegn;
      d.style.left = (b.left + b.width * (.25 + Math.random() * .5)) + "px";
      d.style.top = (b.top + b.height * (.15 + Math.random() * .25)) + "px";
      d.style.animationDelay = (i * .08) + "s";
      document.body.appendChild(d);
      later(() => d.remove(), 900);
    }
  }

  /* ---------- Besøgende dyr med buket-ønske ---------- */
  function nyKunde(stille) {
    const tilgaengelige = SORTER.filter(s => tilstand.buketter >= s.krav);
    const k = KUNDER[Math.floor(Math.random() * KUNDER.length)];
    // Vælg 2 blomster til ønsket (gerne mindst én der allerede gror i haven, så det er dejligt overskueligt for en 4-årig!)
    const iHaven = tilstand.potter.filter(p => p.sort).map(p => p.sort);
    const oensker = [];
    for (let i = 0; i < 2; i++) {
      const pool = i === 0 && iHaven.length ? iHaven : tilgaengelige.map(s => s.id);
      oensker.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    kunde = { ...k, oensker };
    buketKurv = [];
    tegnKunde();
    tegnDock();
    tegnPotter();
    if (!stille && !Spil.isTalking()) {
      later(() => !Spil.isTalking() && Spil.say(k.tekst, null, k.key), 500);
    }
  }

  function tegnKunde() {
    const el = $(".bh-kunde");
    if (!el) return;
    if (!kunde) { el.classList.add("skjult"); return; }
    el.classList.remove("skjult", "glad");
    const img = el.querySelector(".bh-kunde-dyr");
    img.src = `${IMG}${kunde.id}.webp`;
    img.alt = kunde.navn;
    const oenskeEl = el.querySelector(".bh-oenske");
    // Tjek hvilke ønsker der allerede ligger i kurven
    const kurvKopi = [...buketKurv];
    oenskeEl.innerHTML = kunde.oensker.map(id => {
      const idx = kurvKopi.indexOf(id);
      const har = idx !== -1;
      if (har) kurvKopi.splice(idx, 1);
      return `<div class="bh-oenske-slot${har ? " har" : ""}"><img src="${IMG}${id}.webp" alt=""></div>`;
    }).join("");
  }

  /* ---------- Levende sommerfugle, bier og mariehøns ---------- */
  function opdaterKryb() {
    const lag = $(".bh-dyr-lag");
    if (!lag) return;
    const antalBlomster = tilstand.potter.filter(p => p.trin === 3).length;
    const oensket = Math.min(4, Math.max(1, Math.ceil(antalBlomster * .75)));
    const typer = ["sommerfugl", "bi", "mariehoene", "sommerfugl"];
    while (kryb.length < oensket) {
      const id = typer[kryb.length % typer.length];
      const el = document.createElement("div");
      el.className = "bh-kryb";
      el.innerHTML = `<img src="${IMG}${id}.webp" alt="" draggable="false">`;
      const k = {
        el, id,
        x: 15 + Math.random() * 70, y: 18 + Math.random() * 34,
        tx: 20 + Math.random() * 60, ty: 20 + Math.random() * 34,
        tid: Math.random() * 6, vend: 1,
      };
      el.addEventListener("click", e => {
        e.stopPropagation();
        haveLyd("kryb");
        el.classList.remove("snur"); void el.offsetWidth; el.classList.add("snur");
        if (!roligt()) Spil.burstAt(el, "✨🌸✨");
        k.tx = 12 + Math.random() * 76; k.ty = 14 + Math.random() * 38;
      });
      lag.appendChild(el);
      kryb.push(k);
    }
  }

  function krybLoop(nu) {
    if (!alive) return;
    raf = requestAnimationFrame(krybLoop);
    if (roligt()) return;
    const t = nu / 1000;
    for (const k of kryb) {
      const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        k.tx = 10 + Math.random() * 80;
        k.ty = 16 + Math.random() * 38;
      } else {
        const fart = k.id === "bi" ? .07 : .045;
        k.x += (dx / d) * fart * 3;
        k.y += (dy / d) * fart * 3;
        if (Math.abs(dx) > 1) k.vend = dx > 0 ? 1 : -1;
      }
      const bob = Math.sin(t * 3.2 + k.tid) * 6;
      k.el.style.left = k.x + "%";
      k.el.style.top = k.y + "%";
      k.el.style.transform = `translate(-50%, calc(-50% + ${bob.toFixed(1)}px)) scaleX(${k.vend})`;
    }
  }

  /* ---------- Tegn potter, pynt, frøbakke og værktøj ---------- */
  function tegnPynt() {
    const b = tilstand.buketter;
    const sv = $(".bh-pynt.svampehus"), fb = $(".bh-pynt.fuglebad"), ly = $(".bh-pynt.lygte"), lk = $(".bh-lyskaede");
    if (sv) sv.hidden = b < 1;
    if (fb) fb.hidden = b < 2;
    if (ly) ly.hidden = b < 3;
    if (lk) lk.classList.toggle("vis", b >= 4);
    const tEl = $(".bh-taeller b");
    if (tEl) tEl.textContent = b;
  }

  function tegnFroeBakke() {
    const bakke = $(".bh-froe-bakke");
    if (!bakke) return;
    bakke.hidden = valgtTool !== "froe";
    if (!bakke.children.length) {
      bakke.innerHTML = SORTER.map(s => `<button class="bh-froe-knap" data-sort="${s.id}" aria-label="${s.navn}">
        <img src="${IMG}${s.id}.webp" alt="${s.navn}" draggable="false">
      </button>`).join("");
      bakke.querySelectorAll(".bh-froe-knap").forEach(btn => {
        btn.addEventListener("click", () => {
          Spil.sfx.click();
          valgtFroe = btn.dataset.sort;
          tegnFroeBakke();
        });
      });
    }
    bakke.querySelectorAll(".bh-froe-knap").forEach(btn => {
      const s = SORT_MAP[btn.dataset.sort];
      const laast = tilstand.buketter < s.krav;
      btn.classList.toggle("laast", laast);
      btn.classList.toggle("valgt", valgtFroe === s.id && !laast);
    });
  }

  function tegnDock() {
    const dock = $(".bh-dock");
    if (!dock) return;
    const harBlomst = tilstand.potter.some(p => p.trin === 3);
    if (!dock.children.length) {
      dock.innerHTML = VAERKTOEJ.map(v =>
        `<button class="bh-tool" data-tool="${v.id}" aria-label="${v.navn}">${v.ikon}<span class="bh-tool-badge" hidden></span></button>`
      ).join("");
      dock.querySelectorAll(".bh-tool").forEach(btn => {
        btn.addEventListener("click", () => {
          Spil.sfx.click();
          const id = btn.dataset.tool;
          if (id === "buket" && buketKurv.length >= 2) { aabnBuketVaerksted(); return; }
          valgtTool = id;
          tegnDock(); tegnFroeBakke(); tegnPotter();
          if (id === "buket" && !sagt.pluk && tilstand.potter.some(p => p.trin === 3) && !Spil.isTalking()) {
            sagt.pluk = true; Spil.say("Pluk blomsterne til buketten!", null, "bh-pluk");
          }
        });
      });
    }
    dock.querySelectorAll(".bh-tool").forEach(btn => {
      const id = btn.dataset.tool, valgt = valgtTool === id;
      btn.classList.toggle("valgt", valgt);
      btn.classList.toggle("klar", id === "buket" && harBlomst && !valgt && buketKurv.length < 2);
      const badge = btn.querySelector(".bh-tool-badge");
      if (badge) {
        const vis = id === "buket" && buketKurv.length > 0;
        badge.hidden = !vis;
        if (vis) badge.textContent = String(buketKurv.length);
      }
    });
  }

  function behovIkon(b) {
    return b === "froe" ? "🌱" : b === "vand" ? "💧" : b === "sol" ? "☀️" : b === "boerste" ? "🐞" : "";
  }

  function opdaterPotte(el, p, voks) {
    el.classList.toggle("klar-pluk", valgtTool === "buket" && p.trin === 3);
    const bEl = el.querySelector(".bh-behov"), bIkon = behovIkon(p.behov);
    if (bEl.textContent !== bIkon) bEl.textContent = bIkon;
    bEl.hidden = !bIkon;
    const stoevEl = el.querySelector(".bh-stoev");
    stoevEl.hidden = p.behov !== "boerste";
    // Opdatér kun selve plante-billedet når art eller væksttrin faktisk har ændret sig, så svaj-animationen ikke starter forfra
    const noegle = `${p.trin}:${p.sort || ""}`;
    const wrap = el.querySelector(".bh-plante-wrap");
    if (wrap.dataset.noegle !== noegle || voks) {
      wrap.dataset.noegle = noegle;
      if (p.trin === 1) wrap.innerHTML = `<img class="bh-plante spire${voks ? " voks" : ""}" src="${IMG}spire.webp" alt="" draggable="false">`;
      else if (p.trin === 2) wrap.innerHTML = `<img class="bh-plante knop${voks ? " voks" : ""}" src="${IMG}knop.webp" alt="" draggable="false">`;
      else if (p.trin === 3 && p.sort) wrap.innerHTML = `<img class="bh-plante${voks ? " voks" : ""}" src="${IMG}${p.sort}.webp" alt="" draggable="false">`;
      else wrap.innerHTML = "";
    }
  }

  function tegnPotter(voksIdx = -1) {
    const baenk = $(".bh-baenk");
    if (!baenk) return;
    if (!baenk.children.length) {
      baenk.innerHTML = tilstand.potter.map((_, idx) => `<div class="bh-potte" data-idx="${idx}" role="button" tabindex="0" aria-label="Potte ${idx + 1}">
        <div class="bh-behov" hidden></div>
        <div class="bh-stoev" hidden><span style="left:18%;top:28%"></span><span style="right:20%;top:18%;animation-delay:.3s"></span><span style="left:45%;top:52%;animation-delay:.6s"></span></div>
        <div class="bh-plante-wrap"></div>
        <div class="bh-pottesk"><div class="bh-jord"></div></div>
      </div>`).join("");
      baenk.querySelectorAll(".bh-potte").forEach(el => {
        el.addEventListener("click", () => trykPotte(Number(el.dataset.idx), el));
      });
    }
    baenk.querySelectorAll(".bh-potte").forEach((el, idx) => {
      opdaterPotte(el, tilstand.potter[idx], voksIdx === idx);
    });
  }

  /* ---------- Interaktion med en blomsterpotte ---------- */
  function trykPotte(idx, el) {
    const p = tilstand.potter[idx];
    if (!p) return;

    // Hvis brugeren trykker på en potte med et tydeligt behov, og har et andet værktøj valgt:
    // Giv blid reaktion og hjælp (ingen straf!)
    if (valgtTool === "froe") {
      if (p.trin === 0) {
        p.sort = valgtFroe;
        p.trin = 1;
        p.behov = "vand";
        gem();
        haveLyd("plant");
        visEffekt(el, "🌱");
        tegnPotter(idx); tegnDock();
        if (!sagt.plant && !Spil.isTalking()) {
          sagt.plant = true; Spil.say("Flot! Giv nu frøet lidt vand.", null, "bh-plant");
        }
      } else {
        // Allerede plantet: lille glad vrik
        Spil.sfx.pop();
        if (!roligt()) Spil.burstAt(el, "✨");
      }
      return;
    }

    if (valgtTool === "vand") {
      haveLyd("vand");
      visEffekt(el, "💧");
      if (p.trin === 1 && p.behov === "vand") {
        p.trin = 2;
        // Ca. hver 3. knop får lidt støv på bladene (som Dyrlægen-pleje!), ellers direkte solskin!
        p.behov = Math.random() < .38 ? "boerste" : "sol";
        gem();
        tegnPotter(idx); tegnDock();
        if (!sagt.vand && !Spil.isTalking()) {
          sagt.vand = true; Spil.say("Dejligt! Nu vokser din blomst.", null, "bh-vand");
        }
      } else if (p.trin === 3) {
        if (!roligt()) Spil.burstAt(el, "💧✨");
      }
      return;
    }

    if (valgtTool === "boerste") {
      haveLyd("boerste");
      visEffekt(el, "✨");
      if (p.behov === "boerste") {
        p.behov = "sol";
        gem();
        tegnPotter(idx);
        if (!sagt.boerste && !Spil.isTalking()) {
          sagt.boerste = true; Spil.say("Sådan! Nu er bladene fine og rene igen.", null, "bh-boerste");
        }
      }
      return;
    }

    if (valgtTool === "sol") {
      haveLyd("sol");
      visEffekt(el, "☀️");
      if (p.trin === 2 && p.behov === "sol") {
        p.trin = 3;
        p.behov = null;
        gem();
        tegnPotter(idx); tegnDock(); opdaterKryb();
        if (!roligt()) Spil.burstAt(el, "✨🌸⭐✨");
        if (!sagt.sol && !Spil.isTalking()) {
          sagt.sol = true; Spil.say("Åh, hvor solen varmer! Se, nu springer den ud!", null, "bh-sol");
        } else if (!sagt.sommerfugl && tilstand.potter.filter(x => x.trin === 3).length >= 2 && !Spil.isTalking()) {
          sagt.sommerfugl = true; Spil.say("Se! En sommerfugl kommer på besøg i din have!", null, "bh-sommerfugl");
        } else if (!Spil.isTalking()) {
          Spil.say("Wow! Hvor er din blomst blevet smuk!", null, "bh-blomst");
        }
      } else if (p.trin === 3) {
        if (!roligt()) Spil.burstAt(el, "☀️✨");
      }
      return;
    }

    if (valgtTool === "buket") {
      if (p.trin === 3 && p.sort) {
        haveLyd("pluk");
        buketKurv.push(p.sort);
        if (!roligt()) Spil.burstAt(el, SORT_MAP[p.sort].ikon + "✨");
        // Efter plukning står en frisk knop tilbage, så haven aldrig bliver tom!
        p.trin = 2;
        p.behov = "sol";
        gem();
        tegnPotter(idx); tegnKunde(); tegnDock();
        if (buketKurv.length >= 2) {
          later(() => aabnBuketVaerksted(), 350);
        }
      } else {
        Spil.sfx.pop();
      }
    }
  }

  /* ---------- Buket-værksted: vælg sløjfe og giv buketten til dyret ---------- */
  function aabnBuketVaerksted() {
    const lag = $(".bh-buket-lag");
    if (!lag) return;
    if (!buketKurv.length) buketKurv = ["solsikke", "tulipan"];
    lag.hidden = false;
    tegnBuketKort();
    if (!Spil.isTalking()) Spil.say("Vælg en flot sløjfe til din buket!", null, "bh-sloejfe");
  }

  function tegnBuketKort() {
    const vis = $(".bh-buket-vis");
    const raekke = $(".bh-sloejfe-raekke");
    if (!vis || !raekke) return;
    const sObj = SLOEJFER.find(s => s.id === valgtSloejfe) || SLOEJFER[0];
    const vinkler = buketKurv.length === 2 ? [-16, 16] : [-24, 0, 24];
    const blomsterHtml = buketKurv.map((id, i) => {
      const ang = vinkler[i] || 0;
      return `<img class="bh-buket-blomst" src="${IMG}${id}.webp" alt="" style="transform:rotate(${ang}deg)">`;
    }).join("");
    vis.innerHTML = `${blomsterHtml}
      <div class="bh-buket-papir"></div>
      <div class="bh-buket-sloejfe" style="--sf:${sObj.farve};--sk:${sObj.kant}">
        <div class="bh-sloejfe-oere"></div><div class="bh-sloejfe-knude"></div><div class="bh-sloejfe-oere"></div>
      </div>`;
    raekke.innerHTML = SLOEJFER.map(s =>
      `<button class="bh-sloejfe-knap${s.id === valgtSloejfe ? " valgt" : ""}" data-s="${s.id}" style="background:${s.farve}" aria-label="${s.id}"></button>`
    ).join("");
    raekke.querySelectorAll(".bh-sloejfe-knap").forEach(btn => {
      btn.addEventListener("click", () => {
        Spil.sfx.click();
        valgtSloejfe = btn.dataset.s;
        tegnBuketKort();
      });
    });
  }

  function givBuket() {
    const lag = $(".bh-buket-lag");
    if (lag) lag.hidden = true;
    const foer = tilstand.buketter;
    tilstand.buketter++;
    buketKurv = [];
    gem();
    tegnPynt(); tegnDock(); tegnFroeBakke();
    const kEl = $(".bh-kunde"), tEl = $(".bh-taeller");
    if (kEl) {
      kEl.classList.add("glad");
      if (!roligt()) {
        Spil.burstAt(kEl, "💐🌸⭐🎉✨");
        later(() => Spil.burstAt(kEl, "💖✨🌷🌻✨"), 300);
      }
    }
    if (tEl) { tEl.classList.remove("pop"); void tEl.offsetWidth; tEl.classList.add("pop"); }
    Spil.sfx.fanfare();
    const nyPynt = (foer < 1 && tilstand.buketter >= 1) || (foer < 2 && tilstand.buketter >= 2) ||
      (foer < 3 && tilstand.buketter >= 3) || (foer < 4 && tilstand.buketter >= 4);
    Spil.say("Tusind tak! Hvor er det en dejlig buket!", () => {
      if (nyPynt) {
        later(() => Spil.say("Se! Du har fået ny pynt til din have!", null, "bh-ny-pynt"), 250);
      }
    }, "bh-tak");
    valgtTool = "sol";
    tegnDock(); tegnPotter();
    later(() => nyKunde(true), 3200);
  }

  function skiftDagNat() {
    tilstand.nat = !tilstand.nat;
    gem();
    root.classList.toggle("nat", tilstand.nat);
    const b = $(".bh-nat-knap");
    if (b) b.textContent = tilstand.nat ? "☀️" : "🌙";
    Spil.sfx.click();
    if (!Spil.isTalking()) {
      Spil.say(tilstand.nat ? "Godnat, lille have. Nu lyser lygten!" : "Godmorgen, lille have!", null, tilstand.nat ? "bh-nat" : "bh-dag");
    }
  }

  Spil.register({
    id: "blomsterhaven", navn: "Haven", ikon: "🌷", farve: "#d9f2cc",
    start(rt) {
      alive = true; timers = []; kryb = []; sagt = {};
      tilstand = indlaes();
      valgtTool = "froe"; valgtFroe = "solsikke"; valgtSloejfe = "lyseroed"; buketKurv = [];

      // Dybe test-links (#blomsterhaven/fuld eller #blomsterhaven/buket)
      if (Spil.dyb === "fuld" || Spil.dyb === "buket") {
        tilstand = {
          potter: SORTER.map(s => ({ sort: s.id, trin: 3, behov: null })),
          buketter: 4,
          nat: false,
        };
      }

      Spil.preload([
        "bh-hej", "bh-plant", "bh-vand", "bh-sol", "bh-boerste", "bh-blomst", "bh-sommerfugl",
        "bh-kunde-kanin", "bh-kunde-pindsvin", "bh-kunde-bjoern", "bh-pluk", "bh-sloejfe",
        "bh-tak", "bh-ny-pynt", "bh-nat", "bh-dag", ...ROS
      ]);

      const stjHtml = Array.from({ length: 18 }, (_, i) =>
        `<span class="bh-stj-prik" style="left:${(i * 19 + 7) % 94}%;top:${(i * 23 + 5) % 52}%;animation-delay:${(i * .35).toFixed(2)}s"></span>`
      ).join("");
      // Lyskæde på en blød bue (parabel) mellem æbletræerne med synlig snor og hængende pærer
      const paerePts = Array.from({ length: 9 }, (_, i) => {
        const u = (i + 1) / 10, x = u * 1000, y = 14 + 4 * u * (1 - u) * 58;
        return `<g class="bh-paere" style="animation-delay:${(i * .28).toFixed(2)}s">
          <circle class="bh-paere-gloed" cx="${x.toFixed(1)}" cy="${(y + 10).toFixed(1)}" r="15" fill="#ffe785" opacity=".4"/>
          <rect x="${(x - 3).toFixed(1)}" y="${(y + 1).toFixed(1)}" width="6" height="5" rx="1.5" fill="#4a354a"/>
          <circle cx="${x.toFixed(1)}" cy="${(y + 10).toFixed(1)}" r="7" fill="#fff3b0" stroke="#4a354a" stroke-width="2"/>
        </g>`;
      }).join("");
      const paererHtml = `<svg viewBox="0 0 1000 100" preserveAspectRatio="none">
        <path d="M 0 14 Q 500 130 1000 14" fill="none" stroke="#4a354a" stroke-width="3.5" stroke-linecap="round"/>
        ${paerePts}
      </svg>`;

      rt.innerHTML = `<div class="bh${tilstand.nat ? " nat" : ""}">
        <div class="bh-bg-dag"></div>
        <div class="bh-bg-nat"></div>
        <div class="bh-himmel">
          <div class="bh-stjerner">${stjHtml}</div>
        </div>
        <div class="bh-top">
          <div class="bh-taeller" aria-label="Buketter">💐 <b>${tilstand.buketter}</b></div>
          <button class="bh-nat-knap" aria-label="Dag og nat">${tilstand.nat ? "☀️" : "🌙"}</button>
        </div>
        <div class="bh-scene">
          <div class="bh-lyskaede">${paererHtml}</div>
          <div class="bh-pynt svampehus" hidden><img src="${IMG}svampehus.webp" alt="" draggable="false"></div>
          <div class="bh-pynt fuglebad" hidden><img src="${IMG}fuglebad.webp" alt="" draggable="false"></div>
          <div class="bh-pynt lygte" hidden><img src="${IMG}lygte.webp" alt="" draggable="false"></div>
          <div class="bh-kunde skjult" role="button" tabindex="0" aria-label="Besøgende dyr">
            <img class="bh-kunde-dyr" src="${IMG}kanin.webp" alt="" draggable="false">
            <div class="bh-oenske"></div>
          </div>
          <div class="bh-dyr-lag"></div>
          <div class="bh-baenk-wrap"><div class="bh-baenk"></div></div>
        </div>
        <div class="bh-froe-bakke"></div>
        <div class="bh-dock"></div>
        <div class="bh-buket-lag" hidden>
          <div class="bh-buket-kort">
            <div class="bh-buket-vis"></div>
            <div class="bh-sloejfe-raekke"></div>
            <button class="bh-giv-knap" aria-label="Giv buket">💐✨</button>
          </div>
        </div>
      </div>`;

      root = rt.querySelector(".bh");
      $(".bh-nat-knap").addEventListener("click", skiftDagNat);
      $(".bh-giv-knap").addEventListener("click", givBuket);
      // Interaktive have-props: fuglebad, svampehus og lygte reagerer med lyd, bevægelse og glimmer!
      const svEl = $(".bh-pynt.svampehus"), fbEl = $(".bh-pynt.fuglebad"), lyEl = $(".bh-pynt.lygte");
      if (svEl) svEl.addEventListener("click", e => {
        e.stopPropagation(); haveLyd("svamp");
        svEl.classList.remove("vrik"); void svEl.offsetWidth; svEl.classList.add("vrik");
        if (!roligt()) Spil.burstAt(svEl, "✨🍄⭐✨");
      });
      if (fbEl) fbEl.addEventListener("click", e => {
        e.stopPropagation(); haveLyd("fugl");
        fbEl.classList.remove("hop"); void fbEl.offsetWidth; fbEl.classList.add("hop");
        if (!roligt()) Spil.burstAt(fbEl, "💧🐦✨💧");
      });
      if (lyEl) lyEl.addEventListener("click", e => {
        e.stopPropagation(); haveLyd("lygte");
        lyEl.classList.toggle("taendt");
        lyEl.classList.remove("vrik"); void lyEl.offsetWidth; lyEl.classList.add("vrik");
        if (!roligt()) Spil.burstAt(lyEl, "✨💛⭐✨");
      });
      $(".bh-kunde").addEventListener("click", () => {
        if (!kunde) return;
        Spil.sfx.click();
        valgtTool = "buket";
        tegnDock(); tegnFroeBakke(); tegnPotter();
        Spil.say(kunde.tekst, null, kunde.key);
      });

      tegnPynt();
      tegnPotter();
      tegnFroeBakke();
      tegnDock();
      opdaterKryb();
      nyKunde(true);

      if (Spil.dyb === "buket") {
        buketKurv = ["solsikke", "tulipan", "regnbue"];
        aabnBuketVaerksted();
      } else if (!Spil.dyb) {
        later(() => Spil.say("Velkommen til din blomsterhave! Plant et frø i en potte.", null, "bh-hej"), 500);
      }

      raf = requestAnimationFrame(krybLoop);
    },
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      kryb = [];
    }
  });
})();
