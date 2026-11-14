// Statistik for voksne: hvilke spil åbnes, og hvor længe leges der med dem?
// Hold fingeren på overskriften "Hvad vil du spille?" i 1,5 sekund for at se den (på computer: skriv "stat").
// Tid tælles kun, mens siden er synlig, og der er trykket inden for de sidste 2 minutter
// (så en iPad, der bare står tændt, ikke tæller med). Alt gemmes kun på enheden (lk-statistik).
(function () {
  const KEY = "lk-statistik", TICK = 5, PAUSE_EFTER = 120000;
  const dagNoegle = d => d.toLocaleDateString("sv-SE"); // ÅÅÅÅ-MM-DD i lokal tid

  function hent() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.spil && d.dage) return d;
    } catch (e) {}
    return { spil: {}, dage: {} };
  }
  let data = hent();
  function gem() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  const post = id => (data.spil[id] = data.spil[id] || { aabnet: 0, sek: 0, sidst: 0 });

  /* ---------- Optælling: koblet på hvert spils start og stop ---------- */
  let aktiv = null, sidstRoert = Date.now();
  Spil.games.forEach(g => {
    const start = g.start, stop = g.stop;
    g.start = function () {
      aktiv = g; sidstRoert = Date.now();
      const p = post(g.id); p.aabnet++; p.sidst = Date.now(); gem();
      return start.apply(this, arguments);
    };
    g.stop = function () { aktiv = null; return stop.apply(this, arguments); };
  });
  addEventListener("pointerdown", () => { sidstRoert = Date.now(); }, true);
  setInterval(() => {
    if (!aktiv || document.hidden || Date.now() - sidstRoert > PAUSE_EFTER) return;
    post(aktiv.id).sek += TICK;
    const dag = dagNoegle(new Date());
    data.dage[dag] = (data.dage[dag] || 0) + TICK;
    // Gem kun de sidste 60 dage
    const graense = dagNoegle(new Date(Date.now() - 60 * 864e5));
    Object.keys(data.dage).forEach(k => { if (k < graense) delete data.dage[k]; });
    gem();
  }, TICK * 1000);

  /* ---------- Siden for voksne ---------- */
  Spil.css("css-statistik", `
    .st{position:fixed;inset:0;z-index:60;overflow:auto;background:var(--meadow);color:var(--ink);font-family:var(--display);
      padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));
      box-sizing:border-box;-webkit-user-select:text;user-select:text}
    .st-in{max-width:760px;margin:0 auto}
    .st h2{margin:4px 72px 2px 0;font-size:clamp(24px,4.2vh,36px);font-weight:800}
    .st-note{margin:0 72px 18px 0;font:500 15px/1.4 system-ui,-apple-system,sans-serif;opacity:.75}
    .st-luk{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));width:60px;height:60px;
      border-radius:50%;background:var(--card);box-shadow:0 5px 0 rgba(31,58,95,.25);font-size:26px}
    .st-kort{background:var(--card);border-radius:22px;padding:16px clamp(14px,3vw,24px);box-shadow:0 6px 0 rgba(31,58,95,.12);margin-bottom:16px}
    .st-kort h3{margin:0 0 12px;font-size:20px;font-weight:800}
    .st-uge{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end;height:130px}
    .st-dag{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px;font:600 13px system-ui,sans-serif}
    .st-dag b{display:block;width:70%;min-height:3px;border-radius:8px 8px 3px 3px;background:#7cc6f2}
    .st-dag.idag b{background:#4d96ff}
    .st-dag small{opacity:.7;font-weight:500}
    .st-raek{display:grid;grid-template-columns:44px 1fr;gap:4px 12px;align-items:center;padding:8px 0;border-top:1px solid rgba(31,58,95,.1)}
    .st-raek:first-of-type{border-top:0}
    .st-ic{font-size:34px;line-height:1;grid-row:span 2;text-align:center}
    .st-navn{display:flex;justify-content:space-between;gap:10px;font-weight:800;font-size:18px}
    .st-navn span{font:600 15px system-ui,sans-serif;white-space:nowrap}
    .st-bar{height:10px;border-radius:99px;background:rgba(31,58,95,.08);overflow:hidden}
    .st-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#5cc46b,#4d96ff)}
    .st-mere{grid-column:2;font:500 13px system-ui,sans-serif;opacity:.7}
    .st-raek.ingen{opacity:.55}
    .st-flyt p{margin:0 0 12px;font:500 15px/1.45 system-ui,-apple-system,sans-serif;opacity:.8}
    .st-knapper{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
    .st-knapper button,.st-knapper label{padding:12px 16px;border-radius:14px;background:#fff;box-shadow:0 3px 0 rgba(31,58,95,.18);
      font:700 16px system-ui,sans-serif;color:var(--ink);cursor:pointer;min-height:48px;box-sizing:border-box;display:inline-flex;align-items:center}
    .st-knapper input[type=file]{display:none}
    .st-flyt textarea{width:100%;box-sizing:border-box;height:110px;border-radius:12px;border:2px solid rgba(31,58,95,.2);padding:10px;
      font:13px ui-monospace,Menlo,Consolas,monospace;background:#fff;color:var(--ink)}
    .st-besked{min-height:1.2em;margin:8px 0 0;font:700 15px system-ui,sans-serif}
    .st-nul{margin-top:8px;padding:12px 18px;border-radius:14px;background:#fff;box-shadow:0 3px 0 rgba(31,58,95,.18);font:600 15px system-ui,sans-serif;color:#b33}
  `);

  function tid(s) {
    const m = Math.round(s / 60);
    if (s > 0 && m < 1) return "under 1 min";
    if (m < 60) return m + " min";
    return Math.floor(m / 60) + " t " + (m % 60) + " min";
  }
  function siden(ts) {
    if (!ts) return "";
    const d = Math.round((new Date(dagNoegle(new Date())) - new Date(dagNoegle(new Date(ts)))) / 864e5);
    return d <= 0 ? "i dag" : d === 1 ? "i går" : `for ${d} dage siden`;
  }

  function vis() {
    data = hent();
    const el = document.createElement("div");
    el.className = "st";
    // Sidste 7 dage
    const dage = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5));
    const maxDag = Math.max(60, ...dage.map(d => data.dage[dagNoegle(d)] || 0));
    const uge = dage.map((d, i) => {
      const s = data.dage[dagNoegle(d)] || 0;
      const navn = i === 6 ? "i dag" : d.toLocaleDateString("da-DK", { weekday: "short" }).replace(".", "");
      return `<div class="st-dag${i === 6 ? " idag" : ""}"><small>${s ? tid(s).replace("under 1 min", "<1 min") : ""}</small>
        <b style="height:${Math.round(s / maxDag * 100)}%"></b>${navn}</div>`;
    }).join("");
    // Spillene, mest brugte først
    const spil = Spil.games.map(g => ({ g, p: data.spil[g.id] || { aabnet: 0, sek: 0, sidst: 0 } }))
      .sort((a, b) => b.p.sek - a.p.sek || b.p.aabnet - a.p.aabnet);
    const maxSek = Math.max(1, ...spil.map(x => x.p.sek));
    const total = spil.reduce((s, x) => s + x.p.sek, 0);
    const raekker = spil.map(({ g, p }) => p.aabnet ? `
      <div class="st-raek"><div class="st-ic">${g.ikon}</div>
        <div class="st-navn">${g.navn}<span>${tid(p.sek)}</span></div>
        <div class="st-bar"><i style="width:${Math.round(p.sek / maxSek * 100)}%"></i></div>
        <div class="st-mere">Åbnet ${p.aabnet} ${p.aabnet === 1 ? "gang" : "gange"} · sidst ${siden(p.sidst)}</div></div>` : `
      <div class="st-raek ingen"><div class="st-ic">${g.ikon}</div>
        <div class="st-navn">${g.navn}<span>–</span></div>
        <div class="st-mere">Ikke prøvet endnu</div></div>`).join("");
    el.innerHTML = `<button class="st-luk" aria-label="Luk">✕</button><div class="st-in">
      <h2>Hvad leges der med?</h2>
      <p class="st-note">Kun for voksne (åbnes ved at holde på overskriften eller skrive "stat"). Gemt på denne enhed. Tid tælles kun, mens der bliver trykket (pause efter 2 min uden tryk). I alt: ${tid(total)}.</p>
      <div class="st-kort"><h3>Sidste 7 dage</h3><div class="st-uge">${uge}</div></div>
      <div class="st-kort"><h3>Spillene</h3>${raekker}</div>
      <div class="st-kort st-flyt"><h3>Flyt fremskridt til en anden side eller enhed</h3>
        <p>Alt hvad der er låst op (dinoer, akvariet, monstre, tegninger, larven osv.) gemmes kun på denne side i denne browser.
          Gem det her, og hent det på den nye side (fx peheje.github.io/leg).</p>
        <div class="st-knapper"><button class="st-gem">📦 Gem som fil</button><button class="st-kopi">📋 Kopiér som tekst</button></div>
        <div class="st-knapper"><label>📥 Hent fra fil<input type="file" class="st-fil" accept=".json,.txt,application/json,text/plain"></label>
          <button class="st-indsaet">📥 Hent fra indsat tekst</button></div>
        <textarea class="st-tekst" placeholder="Indsæt teksten her (eller den kopierede tekst vises her)" spellcheck="false"></textarea>
        <p class="st-besked" role="status"></p></div>
      <button class="st-nul">Nulstil statistik</button></div>`;
    document.body.appendChild(el);
    const luk = () => { el.remove(); removeEventListener("keydown", tast); };
    const tast = e => { if (e.key === "Escape") luk(); };
    addEventListener("keydown", tast);
    el.querySelector(".st-luk").onclick = luk;
    flyt(el);
    el.querySelector(".st-nul").onclick = () => {
      if (!confirm("Slet al statistik på denne enhed?")) return;
      data = { spil: {}, dage: {} }; gem(); luk(); vis();
    };
  }

  /* ---------- Flyt fremskridt (alle lk-* nøgler) mellem sider/enheder ---------- */
  function pakUd() {
    const d = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^lk-/.test(k)) d[k] = localStorage.getItem(k); } } catch (e) {}
    return JSON.stringify({ legekassen: 1, gemt: new Date().toISOString(), data: d });
  }
  function pakInd(tekst) {
    let o; try { o = JSON.parse(tekst.trim()); } catch (e) { throw new Error("Teksten kunne ikke læses."); }
    const d = o && o.legekassen && o.data;
    if (!d || typeof d !== "object") throw new Error("Det ligner ikke en Legekassen-fil.");
    const keys = Object.keys(d).filter(k => /^lk-/.test(k) && typeof d[k] === "string");
    if (!keys.length) throw new Error("Der er intet fremskridt i filen.");
    if (!confirm(`Hent ${keys.length} gemte ting? Det overskriver det samme fremskridt på denne side.`)) return false;
    keys.forEach(k => localStorage.setItem(k, d[k]));
    return keys.length;
  }
  function flyt(el) {
    const q = s => el.querySelector(s), tekst = q(".st-tekst"), besked = q(".st-besked");
    const sig = (m, ok) => { besked.textContent = m; besked.style.color = ok ? "#2a7a3a" : "#b33"; };
    const antal = () => Object.keys(JSON.parse(pakUd()).data).length;
    q(".st-gem").onclick = () => {
      try {
        const url = URL.createObjectURL(new Blob([pakUd()], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = "legekassen-fremskridt.json";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
        sig(`Gemt (${antal()} ting). Kom filen ikke? Brug "Kopiér som tekst" i stedet.`, true);
      } catch (e) { sig("Kunne ikke gemme som fil her. Brug \"Kopiér som tekst\".", false); }
    };
    q(".st-kopi").onclick = async () => {
      const t = pakUd(); tekst.value = t;
      try { await navigator.clipboard.writeText(t); sig(`Kopieret (${antal()} ting). Indsæt teksten på den nye side.`, true); }
      catch (e) { tekst.focus(); tekst.select(); sig("Teksten står i feltet herunder: markér alt og kopiér den.", true); }
    };
    const hent = t => {
      try { const n = pakInd(t); if (n) { sig(`Hentet ${n} ting! Siden genindlæses …`, true); setTimeout(() => location.reload(), 900); } }
      catch (e) { sig(e.message, false); }
    };
    q(".st-indsaet").onclick = () => hent(tekst.value);
    q(".st-fil").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(hent, () => sig("Filen kunne ikke læses.", false)); };
  }

  // Hold fingeren på overskriften i menuen i 1,5 sekund
  const h1 = document.querySelector(".menu h1");
  if (h1) {
    let t = 0;
    const slip = () => clearTimeout(t);
    h1.addEventListener("pointerdown", () => { slip(); t = setTimeout(() => { Spil.sfx.click(); vis(); }, 1500); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => h1.addEventListener(ev, slip));
  }
  // På computer: skriv "stat" på tastaturet, mens menuen er fremme (bogstaverne inden for 2 sekunder)
  let skrevet = "", sidstTast = 0;
  addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    const nu = Date.now();
    if (nu - sidstTast > 2000) skrevet = "";
    sidstTast = nu;
    skrevet = (skrevet + e.key.toLowerCase()).slice(-4);
    const menu = document.getElementById("menu");
    if (skrevet === "stat" && menu && !menu.hidden && !document.querySelector(".st")) { skrevet = ""; vis(); }
  });
  Spil.visStatistik = vis; // til test
})();
