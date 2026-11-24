// Service Worker til Legekassen — gør appen brugbar offline på iPad og telefon.
// Relative stier gør, at den virker både på localhost (/) og GitHub Pages (/leg/).
const CACHE = "legekassen-v2";
const KERNE = [
  "./",
  "./index.html",
  "./shared.js",
  "./statistik.js",
  "./fjernbetjening.js",
  "./manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(KERNE);
    // Præ-cachér alle spil/*.js (og evt. menu-fliser) fra index.html, så første online-besøg er nok til offline-brug
    try {
      const idx = await cache.match("./index.html");
      if (idx) {
        const html = await idx.text();
        const spil = [...html.matchAll(/src="(spil\/[^"]+\.js)"/g)].map((m) => "./" + m[1]);
        if (spil.length) await cache.addAll(spil);
        const fliser = spil.map((p) => "./billeder/menu/" + p.slice(7, -3) + ".webp");
        await Promise.allSettled(fliser.map((u) => cache.add(u).catch(() => {})));
      }
    } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first til tunge/sjældent ændrede aktiver (lyd, billeder, vendor, fonte)
async function cacheFoerst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.status === 200 || res.type === "opaque")) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone()).catch(() => {});
  }
  return res;
}

// Network-first med cache-fallback til HTML og JS, så opdateringer kommer automatisk online
async function netFoerst(req, erNav) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req, { ignoreSearch: erNav });
    if (cached) return cached;
    if (erNav) {
      return (await caches.match("./index.html")) || (await caches.match("./"));
    }
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Google Fonts caches blidt, så de virker offline uden at fejle
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    e.respondWith(cacheFoerst(e.request).catch(() => new Response("", { status: 504 })));
    return;
  }

  // Cachér ALDRIG cross-origin kald (fx Cloud Run SSE i fjernbetjening.js)
  if (url.origin !== self.location.origin) return;

  // Cachér ikke foraeldre.html (kræver live-forbindelse til fjernbetjening)
  const base = new URL("./", self.registration.scope).pathname;
  const rel = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname.replace(/^\/+/, "");
  if (rel === "foraeldre.html") return;

  // Lyd, billeder og tredjepartsbiblioteker: cache-first
  if (/^(lyd|billeder|vendor)\//.test(rel)) {
    e.respondWith(cacheFoerst(e.request));
    return;
  }

  // HTML, manifest og JS (inkl. spil/*.js): network-first med offline-fallback
  const erNav = e.request.mode === "navigate";
  e.respondWith(netFoerst(e.request, erNav));
});
