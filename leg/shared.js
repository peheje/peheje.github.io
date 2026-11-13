// Fælles værktøjer for alle spil: stemme (tale), lydeffekter, konfetti.
// Hvert spil registrerer sig med Spil.register({id, navn, ikon, farve, start(root), stop()}).
(function () {
  const $ = id => document.getElementById(id);
  const Spil = { games: [], register(g) { this.games.push(g); } };

  /* ---------- Stemme ---------- */
  let voice = null, saved = null, current = null;
  try { saved = localStorage.getItem("fd-voice"); } catch (e) {}
  const rank = x => { const s = x.voiceURI + " " + x.name;
    return /premium|natural/i.test(s) ? 3 : /espeak/i.test(s) ? -1 : /enhanced|forbedret/i.test(s) ? 2 : /compact|kompakt/i.test(s) ? 0 : 1; };
  const label = x => x.name + (/premium/i.test(x.voiceURI) ? " (Premium)" : /enhanced/i.test(x.voiceURI) ? " (Forbedret)" : /compact/i.test(x.voiceURI) ? " (Kompakt)" : "");
  function danishVoices() {
    if (!("speechSynthesis" in window)) return [];
    return speechSynthesis.getVoices().filter(x => /^da/i.test(x.lang)).sort((a, b) => rank(b) - rank(a));
  }
  function pickVoice() {
    const v = danishVoices(); if (!v.length) return v;
    voice = v.find(x => x.voiceURI === saved) || v[0];
    return v;
  }
  function setVoice(uri) { saved = uri; try { localStorage.setItem("fd-voice", uri); } catch (e) {} pickVoice(); }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.addEventListener("voiceschanged", () => { pickVoice(); Spil.onVoices && Spil.onVoices(); });
    [300, 1000, 2500].forEach(t => setTimeout(() => { pickVoice(); Spil.onVoices && Spil.onVoices(); }, t));
  }

  // say(text, done): taler og kalder done() først når stemmen er HELT færdig.
  // Online-stemmer (fx Edge "Natural") er langsomme til at starte, så vi venter på
  // onend og bruger kun en sikkerhedstimer, der selv tjekker om der stadig tales.
  //
  // Hvis keys er givet (fx ["er-mus","find-kat"]), afspilles de færdige lydfiler i lyd/<key>.mp3
  // én efter én. Mangler en fil, bruges browserens egen stemme med text i stedet.
  let token = 0, talking = false, src = null;
  const AC = window.AudioContext || window.webkitAudioContext;
  function ctx() { actx = actx || new AC(); if (actx.state === "suspended") actx.resume(); return actx; }
  const clips = {};
  // Lyd-pakker: den udgivne artifact kan højst have ~500 filer, så dér samles lydene i én pakke pr. præfiks
  // (lyd/pakke-<præfiks>.json med {nøgle: base64-mp3}). Kun når siden sætter window.LYD_PAKKER; ellers hentes
  // lyd/<nøgle>.mp3 som altid (lokalt og i repoet).
  const pakker = {};
  function pakke(key) {
    const p = key.split("-")[0];
    if (!(p in pakker)) pakker[p] = fetch("lyd/pakke-" + p + ".json").then(r => r.ok ? r.json() : null).catch(() => null);
    return pakker[p];
  }
  function fraBase64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function hentLyd(key) {
    const fil = () => fetch("lyd/" + key + ".mp3").then(r => { if (!r.ok) throw new Error(key); return r.arrayBuffer(); });
    if (!window.LYD_PAKKER) return fil();
    return pakke(key).then(pk => pk && pk[key] ? fraBase64(pk[key]) : fil());
  }
  function load(key) {
    if (!clips[key]) {
      clips[key] = hentLyd(key)
        .then(b => new Promise((res, rej) => ctx().decodeAudioData(b, res, rej)));
      clips[key].catch(() => { delete clips[key]; });
    }
    return clips[key];
  }
  function preload(keys) { keys.forEach(k => load(k).catch(() => {})); }
  function stopSrc() { if (src) { try { src.onended = null; src.stop(); } catch (e) {} src = null; } }

  function say(text, done, keys) {
    const my = ++token;
    stopSrc();
    let finished = false; talking = true;
    const fin = () => { if (finished || my !== token) return; finished = true; talking = false; done && done(); };
    if (keys && AC) {
      try { speechSynthesis.cancel(); } catch (e) {}
      Promise.all([].concat(keys).map(load)).then(bufs => {
        if (my !== token) return;
        const c = ctx(); let i = 0;
        const total = bufs.reduce((s, b) => s + b.duration, 0);
        setTimeout(fin, total * 1000 + 2500); // sikkerhed hvis lyden ikke kan starte
        const next = () => {
          if (my !== token) return;
          if (i >= bufs.length) return fin();
          const s = c.createBufferSource(); s.buffer = bufs[i++]; s.connect(c.destination);
          s.onended = () => { if (src === s) src = null; next(); };
          src = s; s.start();
        };
        next();
      }, () => { if (my === token) tts(text, fin, my); });
      return;
    }
    tts(text, fin, my);
  }

  function tts(text, fin, my) {
    if (!("speechSynthesis" in window)) { setTimeout(fin, 900); return; }
    try {
      if (!voice) pickVoice();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "da-DK"; if (voice) u.voice = voice; u.rate = .95; u.pitch = 1;
      u.onend = fin; u.onerror = fin;
      current = u; // hold en reference, ellers kan browseren glemme onend
      speechSynthesis.speak(u);
    } catch (e) { setTimeout(fin, 900); return; }
    const started = Date.now();
    const check = () => {
      if (!talking || my !== token) return;
      const busy = speechSynthesis.speaking || speechSynthesis.pending;
      if (!busy && Date.now() - started > 1500) return fin();
      if (Date.now() - started > 15000) return fin();
      setTimeout(check, 300);
    };
    setTimeout(check, 1500);
  }
  function stopTalking() { token++; talking = false; stopSrc(); try { speechSynthesis.cancel(); } catch (e) {} }
  const isTalking = () => talking;
  // Dyr med en rigtig dyrelyd i lyd/dyr-<dyr>.mp3 (frie CC0-optagelser, se lyd/DYRELYDE.md).
  // For dem siger ja-<dyr> "Ja! Hør, hvad koen siger!", og så kommer dyrets egen lyd bagefter.
  // Samme liste står i lyd-vaerktoej/lav_lyd.py (DYRELYD) — ret begge steder.
  const DYRELYD = new Set(["ko", "kat", "hund", "gris", "and", "faar", "hest", "loeve", "froe", "ugle",
    "hoene", "mus", "elefant", "abe", "fisk", "bi", "slange"]);
  const jaDyr = k => DYRELYD.has(k) ? ["ja-" + k, "dyr-" + k] : ["ja-" + k];
  // Filnavne bruger aa/oe/ae i stedet for å/ø/æ
  const key = s => s.toLowerCase().replace(/å/g, "aa").replace(/ø/g, "oe").replace(/æ/g, "ae");

  /* ---------- Lydeffekter ---------- */
  let actx = null;
  function tone(freqs, dur = .12, type = "sine") {
    try {
      ctx();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * dur;
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur * 1.6);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur * 1.8);
      });
    } catch (e) {}
  }
  const sfx = {
    right: () => tone([523, 659, 784, 1047]),
    wrong: () => tone([220, 180], .15, "triangle"),
    pop: () => tone([900 + Math.random() * 400, 300], .06, "square"),
    fanfare: () => tone([523, 659, 784, 659, 784, 1047], .14),
    click: () => tone([440, 660], .1),
  };

  /* ---------- Konfetti ---------- */
  function burst(x, y, chars = "⭐✨🌟⭐✨🌟⭐✨") {
    [...chars].forEach((s, i, arr) => {
      const d = document.createElement("div"); d.className = "confetti"; d.textContent = s;
      const ang = i / arr.length * Math.PI * 2;
      d.style.left = x - 17 + "px"; d.style.top = y - 17 + "px";
      d.style.setProperty("--dx", Math.cos(ang) * 160 + "px");
      d.style.setProperty("--dy", Math.sin(ang) * 160 + "px");
      d.style.setProperty("--r", (Math.random() * 360 | 0) + "deg");
      document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
    });
  }
  function burstAt(el, chars) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, chars); }

  // Tilføj CSS fra et spil (holdes inde i spillets egen fil)
  function css(id, text) { if ($(id)) return; const s = document.createElement("style"); s.id = id; s.textContent = text; document.head.appendChild(s); }

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  Object.assign(Spil, { say, stopTalking, isTalking, preload, key, jaDyr, audio: ctx, tone, sfx, burst, burstAt, css, shuffle, danishVoices, label, setVoice, getVoice: () => voice });
  window.Spil = Spil;
})();
