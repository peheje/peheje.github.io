// The burrow quietly reflects the real sky outside: the candle is lit after
// dark, rain shows on the step, frost on the door frame, snow drifts at the
// threshold. Nothing here asks for attention; it is only there if you look.

const CACHE_KEY = "peheje_burrow_sky";
const CACHE_MS = 30 * 60 * 1000;
const COPENHAGEN = { lat: 55.68, lon: 12.57 };

// Open-Meteo WMO weather codes, folded into what a burrow door would notice.
export function skyForCode(code) {
  if (!Number.isFinite(code)) return "clear";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloud";
  return "clear";
}

export function lightForHour(hour) {
  if (hour >= 7 && hour < 16) return "day";
  if ((hour >= 16 && hour < 19) || (hour >= 6 && hour < 7)) return "dusk";
  return "night";
}

const skyNotes = {
  storm: "Thunder somewhere over the hill. The candle leans away from it.",
  snow: "Snow has drifted against the door.",
  rain: "Rain is tapping at the door. A cloth lies ready on the step.",
  fog: "Fog has come down. The door smells of wet leaves.",
};

// sky: { code, temperature, isDay } or null when the weather is unknown.
export function burrowMood(sky, date = new Date()) {
  const hour = date.getHours();
  let light = lightForHour(hour);
  // Trust the forecast's own daylight when we have it (winter afternoons are dark).
  if (sky && sky.isDay === false && light === "day") light = "dusk";
  if (sky && sky.isDay === true && light === "night") light = "dusk";
  const kind = sky ? skyForCode(sky.code) : "clear";
  const frost = Boolean(sky) && Number.isFinite(sky.temperature) && sky.temperature <= 0;
  let note = skyNotes[kind] || "";
  if (!note && frost) note = "Frost on the door frame. The hamster has put on the second sock.";
  return { light, sky: kind, frost, note, jul: date.getMonth() === 11 };
}

function readLocation(storage) {
  try {
    const stored = JSON.parse(storage?.getItem("weather_location") || "null");
    if (stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lon)) return { lat: stored.lat, lon: stored.lon };
  } catch {
    // Fall back to Copenhagen.
  }
  return COPENHAGEN;
}

export async function loadBurrowSky({ storage, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  try {
    const cached = JSON.parse(storage?.getItem(CACHE_KEY) || "null");
    if (cached && now - cached.at < CACHE_MS && cached.sky) return cached.sky;
  } catch {
    // Ignore a broken cache.
  }
  try {
    const { lat, lon } = readLocation(storage);
    const params = new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lon.toFixed(2),
      current: "temperature_2m,weather_code,is_day",
      timezone: "auto",
    });
    const response = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) return null;
    const { current } = await response.json();
    if (!current) return null;
    const sky = { code: current.weather_code, temperature: current.temperature_2m, isDay: current.is_day === 1 };
    try {
      storage?.setItem(CACHE_KEY, JSON.stringify({ at: now, sky }));
    } catch {
      // A full or blocked storage only costs a refetch.
    }
    return sky;
  } catch {
    return null;
  }
}
