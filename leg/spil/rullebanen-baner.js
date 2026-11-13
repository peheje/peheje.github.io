// Banerne til Rullebanen. Hver bane er bare data, så nye baner kan tilføjes her uden at røre motoren.
//
// Verden er 100 bred og 160 høj; x går mod højre, y går NEDAD. Pindsvinet har radius 5.
// Felter:
//   id        unik nøgle (bruges til at huske æbler)          tema   "over" (solskin) eller "under" (under jorden)
//   start     [x, y] hvor pindsvinet starter (ignoreres, hvis der er en slynge)
//   elementer listen af ting på banen (se nedenfor)            pynt   ren dekoration (sol, trae, blomst, svamp, krystal)
//   hjaelp    løsningen: [{type:"klip", fra:[x,y], til:[x,y]}] eller [{type:"kast", traek:[dx,dy]}]
//             Bruges af hjælpe-hånden OG af den automatiske test, der tjekker at banen kan klares.
//             Flere handlinger efter hinanden kan få et tidspunkt: {..., t: 1.2} (sekunder efter start).
//   replik    (valgfri) lydnøgle der siges ved start; ellers vælges "rulle-klip" eller "rulle-kast"
//
// Elementer:
//   {type:"jord", punkter:[[x,y],...], fyld:"ned"|"op"|"ingen", tyk:1, skjult:false}
//       en brudt linje pindsvinet kan rulle på. "ned" = jord under linjen, "op" = loft over linjen,
//       "ingen" = en tyk væg/rod. Rører linjen x<=0 eller x>=100, fortsætter jorden ud til skærmens kant.
//       skjult:true = usynlig væg (bruges til banens kanter, så pindsvinet ikke ryger ud).
//   {type:"planke", fra:[x,y], til:[x,y]}             en træplanke
//   {type:"trampolin", fra:[x,y], til:[x,y], hop:175}  hopper pindsvinet op (vinkelret på planken); hop = mindste fart
//   {type:"snor", anker:[x,y], slap:1}                snor fra anker til pindsvinet; stryg over den for at klippe
//   {type:"slynge", x, y}                              blad/svampehat pindsvinet ligger på og kan kastes fra
//   {type:"aeble", x, y}                               frivillig bonus
//   {type:"hule", x, y, r:8}                           målet
//
// Tjek nye baner: åbn spillet i browseren og kør i konsollen
//   RULLEBANER.map(b => [b.id, Spil.rullebanen.simuler(b)])
// Hver bane skal give resultat "hjemme" med sin hjaelp (og helst alle æbler), og "tid" uden handlinger.
window.RULLEBANER = [
  {
    id: "klip-1", tema: "over",
    start: [26, 58],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 104], [22, 110], [60, 126], [100, 134]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 134], [100, 90]] },
      { type: "snor", anker: [26, 16] },
      { type: "aeble", x: 26, y: 86 },
      { type: "aeble", x: 50, y: 114 },
      { type: "hule", x: 86, y: 124, r: 8 },
    ],
    pynt: [{ type: "sol", x: 80, y: 20 }, { type: "trae", x: 8, y: 106 }, { type: "blomst", x: 40, y: 117 }, { type: "blomst", x: 70, y: 129, farve: "#ffd84a" }],
    hjaelp: [{ type: "klip", fra: [16, 36], til: [36, 36] }],
  },
  {
    id: "kast-1", tema: "over",
    start: [16, 100],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 112], [26, 112], [34, 150], [60, 150], [66, 110], [100, 110]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 110], [100, 60]] },
      { type: "slynge", x: 16, y: 106 },
      { type: "aeble", x: 50, y: 74 },
      { type: "hule", x: 86, y: 101, r: 8 },
    ],
    pynt: [{ type: "sol", x: 18, y: 22 }, { type: "blomst", x: 46, y: 150 }, { type: "blomst", x: 52, y: 150, farve: "#b48cf0" }, { type: "trae", x: 74, y: 110 }],
    hjaelp: [{ type: "kast", traek: [-17, 17] }],
  },
  {
    id: "klip-2", tema: "over",
    start: [50, 56],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 96], [38, 134], [44, 140], [56, 140], [62, 134], [100, 96]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[0, 96], [0, 6]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 96], [100, 6]] },
      { type: "snor", anker: [26, 18] },
      { type: "snor", anker: [74, 18] },
      { type: "aeble", x: 74, y: 116 },
      { type: "aeble", x: 78, y: 70 },
      { type: "hule", x: 50, y: 132, r: 8 },
    ],
    pynt: [{ type: "sol", x: 50, y: 14 }, { type: "blomst", x: 14, y: 106 }, { type: "blomst", x: 88, y: 106, farve: "#ffd84a" }],
    hjaelp: [{ type: "klip", fra: [28, 30], til: [44, 40] }, { type: "klip", fra: [58, 28], til: [98, 28], t: 1.4 }],
  },
  // Første bane med en planke: klip snoren, og pindsvinet triller ned ad rampen
  {
    id: "planke-1", tema: "over",
    start: [30, 52],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 150], [100, 150]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 150], [100, 100]] },
      { type: "planke", fra: [14, 100], til: [62, 118] },
      { type: "snor", anker: [30, 12] },
      { type: "aeble", x: 30, y: 82 },
      { type: "aeble", x: 70, y: 114 },
      { type: "hule", x: 88, y: 142, r: 8 },
    ],
    pynt: [{ type: "sol", x: 80, y: 22 }, { type: "trae", x: 8, y: 150 }, { type: "blomst", x: 50, y: 150 }, { type: "blomst", x: 94, y: 150, farve: "#ffd84a" }],
    hjaelp: [{ type: "klip", fra: [20, 30], til: [40, 30] }],
  },
  // ---- Lidt sværere over jorden: ingen usynlige kanter, man kan skyde for kort eller for langt ----
  {
    id: "kast-3", tema: "over",
    start: [14, 120],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 134], [24, 134], [30, 170]] },
      { type: "jord", fyld: "ned", punkter: [[48, 170], [52, 112], [100, 112]] },
      { type: "slynge", x: 14, y: 130 },
      { type: "aeble", x: 48, y: 98 },
      { type: "hule", x: 84, y: 102, r: 10 },
    ],
    pynt: [{ type: "sol", x: 82, y: 22 }, { type: "blomst", x: 6, y: 134 }, { type: "trae", x: 64, y: 112 }, { type: "blomst", x: 96, y: 112, farve: "#ffd84a" }],
    hjaelp: [{ type: "kast", traek: [-15, 21] }],
  },
  {
    id: "klip-3", tema: "over",
    start: [24, 60],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[58, 170], [60, 118], [100, 118]] },
      { type: "snor", anker: [8, 12] },
      { type: "snor", anker: [62, 12] },
      { type: "aeble", x: 64, y: 88 },
      { type: "hule", x: 86, y: 108, r: 10 },
    ],
    pynt: [{ type: "sol", x: 84, y: 24 }, { type: "blomst", x: 72, y: 118 }, { type: "trae", x: 98, y: 118 }],
    // Klip venstre snor, lad pindsvinet svinge, og klip den højre, når det er på vej op mod højre
    hjaelp: [{ type: "klip", fra: [1, 15], til: [15, 15], t: 0.3 }, { type: "klip", fra: [55, 15], til: [69, 15], t: 0.8 }],
  },
  // Klip snoren, og lad trampolinen kaste pindsvinet op på bakken
  {
    id: "klip-5", tema: "over",
    start: [24, 50],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 150], [46, 150]] },
      { type: "jord", fyld: "ned", punkter: [[46, 150], [46, 96], [100, 96]] },
      { type: "trampolin", fra: [12, 104], til: [40, 108], hop: 175 },
      { type: "snor", anker: [24, 10] },
      { type: "aeble", x: 36, y: 62 },
      { type: "hule", x: 86, y: 87, r: 10 },
    ],
    pynt: [{ type: "sol", x: 82, y: 24 }, { type: "blomst", x: 30, y: 150 }, { type: "trae", x: 98, y: 96 }],
    hjaelp: [{ type: "klip", fra: [14, 30], til: [34, 30] }],
  },
  {
    id: "kast-4", tema: "over",
    start: [14, 120],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 132], [100, 132]] },
      { type: "jord", fyld: "ingen", tyk: 3, punkter: [[50, 132], [50, 110]] },
      { type: "slynge", x: 14, y: 128 },
      { type: "aeble", x: 46, y: 84 },
      { type: "hule", x: 80, y: 122, r: 10 },
    ],
    pynt: [{ type: "sol", x: 20, y: 22 }, { type: "blomst", x: 34, y: 132, farve: "#b48cf0" }, { type: "blomst", x: 92, y: 132 }],
    hjaelp: [{ type: "kast", traek: [-10, 23] }],
  },
  // Kast over bakken
  {
    id: "kast-5", tema: "over",
    start: [14, 124],
    elementer: [
      { type: "jord", fyld: "ned", punkter: [[0, 128], [24, 128], [38, 106], [52, 128], [100, 128]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 128], [100, 70]] },
      { type: "slynge", x: 14, y: 124 },
      { type: "aeble", x: 40, y: 92 },
      { type: "hule", x: 70, y: 119, r: 10 },
    ],
    pynt: [{ type: "sol", x: 80, y: 22 }, { type: "blomst", x: 6, y: 128 }, { type: "blomst", x: 60, y: 128, farve: "#b48cf0" }, { type: "trae", x: 92, y: 128 }],
    hjaelp: [{ type: "kast", traek: [-16, 15] }],
  },
  {
    id: "under-1", tema: "under",
    start: [20, 42],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 10], [100, 10]] },
      { type: "jord", fyld: "ned", punkter: [[0, 142], [55, 142]] },
      { type: "jord", fyld: "ingen", tyk: 2, punkter: [[55, 142], [55, 106]] },
      { type: "jord", fyld: "ned", punkter: [[55, 106], [100, 106]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 106], [100, 10]] },
      { type: "trampolin", fra: [8, 128], til: [32, 136] },
      { type: "snor", anker: [20, 10] },
      { type: "aeble", x: 20, y: 100 },
      { type: "aeble", x: 58, y: 86 },
      { type: "hule", x: 86, y: 97, r: 8 },
    ],
    pynt: [{ type: "svamp", x: 40, y: 142 }, { type: "svamp", x: 66, y: 106, s: .8 }, { type: "krystal", x: 4, y: 142 }, { type: "krystal", x: 94, y: 106, farve: "#7fe3ff" }],
    hjaelp: [{ type: "klip", fra: [12, 24], til: [28, 24] }],
    replik: "rulle-klip",
  },
  {
    id: "under-2", tema: "under",
    start: [16, 130],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 24], [100, 24]] },
      { type: "jord", fyld: "ned", punkter: [[0, 140], [100, 140]] },
      { type: "jord", fyld: "ingen", tyk: 3, punkter: [[50, 140], [50, 112]] },
      { type: "slynge", x: 16, y: 136 },
      { type: "aeble", x: 48, y: 98 },
      { type: "hule", x: 84, y: 131, r: 8 },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 140], [100, 60]] },
    ],
    pynt: [{ type: "svamp", x: 30, y: 140 }, { type: "svamp", x: 66, y: 140, s: 1.2 }, { type: "krystal", x: 92, y: 140, farve: "#ff9fd0" }],
    hjaelp: [{ type: "kast", traek: [-15, 21] }],
  },
  // Rampen fører mod venstre: hulen ligger til venstre denne gang
  {
    id: "under-5", tema: "under",
    start: [60, 64],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 22], [100, 22]] },
      { type: "jord", fyld: "ned", punkter: [[0, 144], [100, 144]] },
      { type: "jord", fyld: "ingen", skjult: true, tyk: 1.2, punkter: [[100, 144], [100, 60]] },
      { type: "planke", fra: [92, 96], til: [34, 122] },
      { type: "snor", anker: [60, 22] },
      { type: "aeble", x: 46, y: 108 },
      { type: "aeble", x: 25, y: 120 },
      { type: "hule", x: 12, y: 135, r: 8 },
    ],
    pynt: [{ type: "svamp", x: 80, y: 144 }, { type: "krystal", x: 70, y: 144, farve: "#ff9fd0" }, { type: "svamp", x: 40, y: 144, s: 1.2 }],
    hjaelp: [{ type: "klip", fra: [50, 40], til: [70, 40] }],
  },
  // ---- Lidt sværere under jorden ----
  {
    id: "under-4", tema: "under",
    start: [14, 132],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 22], [100, 22]] },
      { type: "jord", fyld: "ingen", tyk: 3, punkter: [[46, 22], [46, 84]] },
      { type: "jord", fyld: "ned", punkter: [[0, 140], [30, 140], [33, 170]] },
      { type: "jord", fyld: "ned", punkter: [[62, 170], [64, 130], [100, 130]] },
      { type: "slynge", x: 14, y: 136 },
      { type: "aeble", x: 46, y: 112 },
      { type: "hule", x: 88, y: 120, r: 10 },
    ],
    pynt: [{ type: "svamp", x: 24, y: 140 }, { type: "krystal", x: 72, y: 130, farve: "#7fe3ff" }, { type: "svamp", x: 80, y: 130, s: .8 }],
    hjaelp: [{ type: "kast", traek: [-22, 13] }],
  },
  {
    id: "under-3", tema: "under",
    start: [14, 132],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 22], [100, 22]] },
      { type: "jord", fyld: "ned", punkter: [[0, 140], [36, 140], [40, 170]] },
      { type: "trampolin", fra: [46, 150], til: [64, 150] },
      { type: "jord", fyld: "ned", punkter: [[70, 170], [72, 100], [100, 100]] },
      { type: "slynge", x: 14, y: 136 },
      { type: "aeble", x: 56, y: 110 },
      { type: "hule", x: 86, y: 90, r: 10 },
    ],
    pynt: [{ type: "svamp", x: 28, y: 140 }, { type: "krystal", x: 4, y: 140, farve: "#ff9fd0" }, { type: "svamp", x: 78, y: 100, s: 1.1 }],
    hjaelp: [{ type: "kast", traek: [-7, 13] }],
  },
  // Første kast til VENSTRE: træk pindsvinet mod højre, så flyver det mod venstre
  {
    id: "under-6", tema: "under",
    start: [80, 146],
    elementer: [
      { type: "jord", fyld: "op", punkter: [[0, 22], [100, 22]] },
      { type: "jord", fyld: "ned", punkter: [[100, 150], [46, 150]] },
      { type: "jord", fyld: "ned", punkter: [[46, 150], [46, 134], [0, 134]] },
      { type: "slynge", x: 80, y: 146 },
      { type: "aeble", x: 62, y: 118 },
      { type: "hule", x: 20, y: 125, r: 10 },
    ],
    pynt: [{ type: "svamp", x: 62, y: 150 }, { type: "krystal", x: 96, y: 150, farve: "#7fe3ff" }, { type: "svamp", x: 6, y: 134, s: .8 }],
    hjaelp: [{ type: "kast", traek: [11, 20] }],
  },
];
