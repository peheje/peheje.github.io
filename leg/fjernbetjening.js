// Fjernbetjening (spisetid / sluk) via egen Cloud Run SSE-server.
// Opsætning på tabletten sker én gang ved at åbne: #fjern=<SERVER_URL>|<READ_TOKEN>
(function () {
  const URL_KEY = "lk-fjern-url";
  const TOK_KEY = "lk-fjern-token";

  try {
    const h = location.hash || "";
    if (h.startsWith("#fjern=")) {
      const [u, t] = decodeURIComponent(h.slice(7)).split("|");
      if (u && t) {
        localStorage.setItem(URL_KEY, u.replace(/\/+$/, ""));
        localStorage.setItem(TOK_KEY, t.trim());
      }
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (e) {}

  let serverUrl = "", readToken = "";
  try {
    serverUrl = localStorage.getItem(URL_KEY) || "";
    readToken = localStorage.getItem(TOK_KEY) || "";
  } catch (e) {}
  if (!serverUrl || !readToken) return;

  let timer = null, sek = 0, pill = null, overlay = null, roert = false;
  addEventListener("pointerdown", () => { roert = true; }, { once: true, capture: true, passive: true });

  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  function fjernPill() {
    if (pill) { pill.remove(); pill = null; }
  }

  function fjernOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function stopAktivtSpil() {
    const homeBtn = document.getElementById("home");
    if (homeBtn && !homeBtn.hidden) homeBtn.click();
    if (window.Spil && Spil.stopTalking) Spil.stopTalking();
  }

  function visSpisetidOverlay(barn) {
    fjernPill();
    fjernOverlay();
    stopAktivtSpil();
    if (window.Spil) {
      Spil.say("Nu er det spisetid! Vi leger videre en anden gang!", null, "spis-nu-" + barn);
    }
    overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:linear-gradient(160deg,#fff7ed,#ffedd5);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;" +
      "padding:24px;font-family:system-ui,sans-serif;color:#7c2d12;user-select:none;";
    overlay.innerHTML =
      '<div style="font-size:84px;line-height:1">🍽️</div>' +
      '<h1 style="font-size:2.2rem;margin:16px 0 8px">Nu skal vi spise!</h1>' +
      '<p style="font-size:1.2rem;margin:0 0 32px;opacity:.85">Vi leger videre en anden gang.</p>' +
      '<button id="lk-unlock" style="padding:10px 18px;border-radius:999px;border:1px solid #fdba74;' +
      'background:#fff;color:#9a3412;font-size:.9rem;opacity:.65;cursor:pointer">🔒 Voksen: lås op</button>' +
      '<div id="lk-gate" hidden style="margin-top:14px;display:flex;gap:8px;align-items:center">' +
      '<input id="lk-aar" type="number" inputmode="numeric" placeholder="Fødselsår (fx 1988)" style="width:160px;padding:10px 12px;border-radius:10px;border:1px solid #fdba74;font-size:1rem;text-align:center">' +
      '<button id="lk-ok" style="padding:10px 16px;border-radius:10px;border:0;background:#ea580c;color:#fff;font-weight:700;font-size:.95rem;cursor:pointer">Lås op</button></div>' +
      '<div id="lk-fejl" style="min-height:1.2em;margin-top:6px;font-size:.85rem;color:#b91c1c"></div>';
    document.body.appendChild(overlay);

    const btn = overlay.querySelector("#lk-unlock");
    const gate = overlay.querySelector("#lk-gate");
    const aar = overlay.querySelector("#lk-aar");
    const fejl = overlay.querySelector("#lk-fejl");
    gate.style.display = "none";
    btn.onclick = () => {
      btn.hidden = true;
      gate.hidden = false;
      gate.style.display = "flex";
      aar.focus();
    };
    const tjek = () => {
      const y = Number(aar.value);
      const max = new Date().getFullYear() - 18;
      if (y >= 1900 && y <= max) fjernOverlay();
      else { fejl.textContent = "Det ligner ikke et voksen-fødselsår."; aar.value = ""; }
    };
    overlay.querySelector("#lk-ok").onclick = tjek;
    aar.onkeydown = e => { if (e.key === "Enter") tjek(); };
  }

  function startNedtælling(barn, minutter) {
    clearInterval(timer);
    fjernOverlay();
    sek = Math.max(1, Math.round((minutter || 5) * 60));

    if (!pill) {
      pill = document.createElement("div");
      pill.style.cssText =
        "position:fixed;top:14px;right:14px;z-index:99998;background:#fff7ed;color:#9a3412;" +
        "border:2px solid #fb923c;border-radius:999px;padding:8px 16px;font:700 1.05rem system-ui,sans-serif;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.12);pointer-events:none;";
      document.body.appendChild(pill);
    }
    pill.textContent = "🍽️ Mad om " + fmt(sek);

    if (window.Spil) {
      const sig = () => Spil.say("Hej! Nu er der fem minutter til du skal spise, og så slukker spillene!", null, "spis-5min-" + barn);
      sig();
      if (!roert) addEventListener("pointerdown", sig, { once: true, capture: true, passive: true });
    }

    timer = setInterval(() => {
      sek--;
      if (sek <= 0) {
        clearInterval(timer);
        timer = null;
        visSpisetidOverlay(barn);
      } else if (pill) {
        pill.textContent = "🍽️ Mad om " + fmt(sek);
      }
    }, 1000);
  }

  function annuller() {
    clearInterval(timer);
    timer = null;
    fjernPill();
    fjernOverlay();
  }

  const es = new EventSource(serverUrl + "/events?token=" + encodeURIComponent(readToken));
  es.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    const barn = (msg.barn || "frida").toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (msg.cmd === "spis5") startNedtælling(barn, msg.minutter || 5);
    else if (msg.cmd === "sluk") visSpisetidOverlay(barn);
    else if (msg.cmd === "annuller") annuller();
  };
})();
