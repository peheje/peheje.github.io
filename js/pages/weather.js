import { mountSiteShell } from "../site.js";
import SunCalc from "../lib/suncalc.js";
import { createScrollableTabBar } from "../scrollable-tabs.js";
import { createRainMock } from "./weather-rain-mock.js";
import {
  getHourPosition,
  getPinnedGraphWeatherValues,
  getSummaryWeatherValues
} from "./weather-now.js";

// Default location (Oslo, Norway)
const DEFAULT_LOC = {
  lat: 59.9133,
  lon: 10.7390,
  name: "Oslo, Norge",
  timeZone: "Europe/Oslo"
};

// Caching parameters
const CACHE_PREFIX = "peheje_weather_";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const GEOCODING_URL = "https://nominatim.openstreetmap.org";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MAX_FORECAST_CACHE_ENTRIES = 12;
const FORECAST_DAY_COUNT = 8;
const TIDE_CACHE_SCHEMA_VERSION = 2;
const RANGE_MODES = [
  { id: "focus", label: "Now + 12h", hours: 12, currentOnly: true },
  { id: "day", label: "24h", hours: 24, days: 1 },
  { id: "two-days", label: "48h", hours: 48, days: 2 },
  { id: "three-days", label: "3 days", hours: 72, days: 3 },
  { id: "four-days", label: "4 days", hours: 96, days: 4 },
  { id: "five-days", label: "5 days", hours: 120, days: 5 }
];
const rainMock = createRainMock();

let currentLoc = { ...DEFAULT_LOC };
let forecastData = null;
let tideData = null;
let activeTab = 0; // 0 for Today, 1 for Tomorrow, then future start dates.
let activeRangeMode = "day";
let hoverHour = null; // Currently hovered hour on the canvas (0-23)
let currentTimePinned = false;
let radarSource = "";
let radarIsInViewport = false;
let radarObserver = null;
let forecastDrawFrame = null;
let clockTimer = null;
let weatherLoadId = 0;
let weatherLoadController = null;
let tideLoadController = null;
let searchController = null;
let searchRequestId = 0;
let lastSearchAt = 0;
let locationIntentId = 0;
const geocodeCache = new Map();
let globalLimits = {
  uvMax: 10,
  tempMin: 0,
  tempMax: 10,
  rainMax: 2.0,
  windMax: 8
};

// DOM Elements
const searchInput = document.getElementById("city-search");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const suggestionsList = document.getElementById("suggestions-list");
const locationDisplay = document.getElementById("location-display");
const gpsBadge = document.getElementById("gps-badge");
const coordinatesDisplay = document.getElementById("coordinates-display");
const errorBar = document.getElementById("error-bar");
const dashboardContent = document.getElementById("dashboard-content");
const loadingSpinner = document.getElementById("loading-spinner");

const dayTabsContainer = document.getElementById("day-tabs");
const rangeTabsContainer = document.getElementById("range-tabs");
const uvCanvas = document.getElementById("uv-canvas");
const tempCanvas = document.getElementById("temp-canvas");
const rainCanvas = document.getElementById("rain-canvas");
const windCanvas = document.getElementById("wind-canvas");
const tideCanvas = document.getElementById("tide-canvas");
const cloudsCanvas = document.getElementById("clouds-canvas");
const moonCanvas = document.getElementById("moon-canvas");

const rangeTabs = createScrollableTabBar(rangeTabsContainer, {
  onChange: item => setRangeMode(item.key)
});
const dayTabs = createScrollableTabBar(dayTabsContainer, {
  onChange: item => changeDay(Number(item.key))
});

// WHO UV Levels config
const UV_LEVELS = [
  { max: 2.9, label: "Low", class: "uv-low", color: "#22c55e", advice: "Low danger. Safe to be outdoors. Wear sunglasses on bright days. If you burn easily, use sunscreen." },
  { max: 5.9, label: "Moderate", class: "uv-moderate", color: "#eab308", advice: "Moderate risk. Seek shade near midday. Wear protective clothing, sunglasses, and use SPF 30+ sunscreen." },
  { max: 7.9, label: "High", class: "uv-high", color: "#ea580c", advice: "High risk. Reduce time in the sun between 10:00 and 16:00. Wear protective clothing, a wide-brimmed hat, sunglasses, and SPF 30+ sunscreen." },
  { max: 10.9, label: "Very High", class: "uv-veryhigh", color: "#dc2626", advice: "Very high risk. Minimize sun exposure between 10:00 and 16:00. Wear protective clothing, a wide-brimmed hat, sunglasses, and SPF 30+ sunscreen." },
  { max: Infinity, label: "Extreme", class: "uv-extreme", color: "#9333ea", advice: "Extreme risk. Avoid sun exposure. Wear protective clothing, a wide-brimmed hat, sunglasses, and SPF 30+ sunscreen. Reapply every 2 hours." }
];

function getUVLevel(val) {
  return UV_LEVELS.find(level => val <= level.max);
}

// Weather Symbols mapping
const WEATHER_SYMBOLS = {
  clearsky: { emoji: "☀️", desc: "Clear Sky" },
  fair: { emoji: "🌤️", desc: "Fair" },
  partlycloudy: { emoji: "⛅", desc: "Partly Cloudy" },
  cloudy: { emoji: "☁️", desc: "Cloudy" },
  rainshowers: { emoji: "🌧️", desc: "Rain Showers" },
  rainshowersandthunder: { emoji: "⛈️", desc: "Rain Showers and Thunder" },
  rain: { emoji: "🌧️", desc: "Rain" },
  heavyrain: { emoji: "⛈️", desc: "Heavy Rain" },
  snowshowers: { emoji: "🌨️", desc: "Snow Showers" },
  snow: { emoji: "❄️", desc: "Snow" },
  heavysnow: { emoji: "🌨️", desc: "Heavy Snow" },
  sleet: { emoji: "🌨️", desc: "Sleet" },
  thunder: { emoji: "⚡", desc: "Thunderstorm" },
  fog: { emoji: "🌫️", desc: "Fog" }
};

function getWeatherSymbolCode(weatherCode) {
  if (weatherCode === 0) return "clearsky";
  if (weatherCode === 1) return "fair";
  if (weatherCode === 2) return "partlycloudy";
  if (weatherCode === 3) return "cloudy";
  if (weatherCode === 45 || weatherCode === 48) return "fog";
  if ([51, 53, 55, 61, 63, 80, 81].includes(weatherCode)) return "rain";
  if ([56, 57, 66, 67].includes(weatherCode)) return "sleet";
  if ([65, 82].includes(weatherCode)) return "heavyrain";
  if ([71, 73, 77, 85].includes(weatherCode)) return "snow";
  if ([75, 86].includes(weatherCode)) return "heavysnow";
  if ([95, 96, 99].includes(weatherCode)) return "rainshowersandthunder";
  return null;
}

function getWeatherInfo(symbolCode) {
  if (!symbolCode) return { emoji: "❔", desc: "Forecast unavailable" };
  const cleanCode = symbolCode.split("_")[0];
  return WEATHER_SYMBOLS[cleanCode] || { emoji: "❔", desc: `Unrecognised forecast (${cleanCode})` };
}

function getWindDirectionLabel(deg) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return directions[val % 16];
}

function getLocationTimeZone() {
  return currentLoc.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getZonedParts(date, timeZone = getLocationTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

// Helper to format selected-location YYYY-MM-DD.
function getLocationDateString(date, timeZone = getLocationTimeZone()) {
  const { year, month, day } = getZonedParts(date, timeZone);
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function getTimeZoneOffset(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const zonedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return zonedUtc - date.getTime();
}

// Convert a wall-clock time in an IANA timezone to an instant. A second pass
// accounts for an offset change around daylight-saving transitions.
function zonedDateTimeToDate(year, month, day, hour = 12, minute = 0, timeZone = getLocationTimeZone()) {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = new Date(wallClock - getTimeZoneOffset(new Date(wallClock), timeZone));
  result = new Date(wallClock - getTimeZoneOffset(result, timeZone));
  return result;
}

function getLocationDayDate(dayIndex, hour = 12, minute = 0) {
  const now = getZonedParts(new Date());
  const dayAnchor = new Date(Date.UTC(now.year, now.month - 1, now.day + dayIndex));
  return zonedDateTimeToDate(
    dayAnchor.getUTCFullYear(),
    dayAnchor.getUTCMonth() + 1,
    dayAnchor.getUTCDate(),
    hour,
    minute
  );
}

function getLocationHour(date) {
  return getZonedParts(date).hour;
}

function getLocationHourPosition(date) {
  return getHourPosition(getZonedParts(date));
}

// Show/hide spinner & dashboard
function setLoaderState(isLoading) {
  const spinnerEl = loadingSpinner.querySelector(".spinner");
  if (isLoading) {
    loadingSpinner.style.display = "flex";
    if (spinnerEl) spinnerEl.style.animation = "spin 1s linear infinite";
    dashboardContent.style.display = "none";
  } else {
    loadingSpinner.style.display = "none";
    if (spinnerEl) spinnerEl.style.animation = "none";
    dashboardContent.style.display = "block";
  }
}

// Show error message
function showError(msg) {
  if (msg) {
    errorBar.textContent = msg;
    errorBar.style.display = "block";
  } else {
    errorBar.style.display = "none";
  }
}

function isHappyDOM() {
  return window.happyDOM || (navigator && navigator.userAgent && /happy-dom|happydom/i.test(navigator.userAgent));
}

function updateRadarResource() {
  if (isHappyDOM()) return;
  const radarIframe = document.getElementById("radar-iframe");
  const radarCard = document.querySelector(".graph-card[data-key='radar']");
  if (!radarIframe) return;

  const shouldLoad = radarSource && document.visibilityState === "visible" &&
    radarIsInViewport && !radarCard?.classList.contains("minimized");
  if (shouldLoad) {
    if (radarIframe.src !== radarSource) radarIframe.src = radarSource;
  } else if (radarIframe.getAttribute("src")) {
    radarIframe.src = "";
  }
}

function setupRadarLifecycle() {
  if (isHappyDOM() || !("IntersectionObserver" in window)) {
    radarIsInViewport = true;
    return;
  }
  const radarCard = document.querySelector(".graph-card[data-key='radar']");
  if (!radarCard) return;
  radarObserver = new IntersectionObserver(entries => {
    radarIsInViewport = entries.some(entry => entry.isIntersecting);
    updateRadarResource();
  }, { threshold: 0.1 });
  radarObserver.observe(radarCard);
}

function scheduleForecastDraw() {
  if (forecastDrawFrame || !forecastData) return;
  forecastDrawFrame = window.requestAnimationFrame(() => {
    forecastDrawFrame = null;
    drawForecastCurves();
  });
}

function getForecastExpiresAt(data) {
  return data.expiresAt || (data.lastUpdated || 0) + CACHE_EXPIRY_MS;
}

function isForecastStale(data) {
  return !data?.lastUpdated || Date.now() >= getForecastExpiresAt(data);
}

function refreshForecastIfStale() {
  if (document.visibilityState === "visible" && forecastData && isForecastStale(forecastData)) {
    loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, true, currentLoc.isGps, false, locationIntentId);
  }
}

function scheduleClockTick() {
  if (clockTimer) clearTimeout(clockTimer);
  if (document.visibilityState !== "visible") return;

  const delay = 60 * 1000 - (Date.now() % (60 * 1000)) + 25;
  clockTimer = setTimeout(() => {
    if (document.visibilityState === "visible" && forecastData) {
      updateDashboardUI(forecastData, false);
      scheduleForecastDraw();
      refreshForecastIfStale();
    }
    scheduleClockTick();
  }, delay);
}

// Load location from LocalStorage
function loadStoredLocation() {
  const stored = localStorage.getItem("weather_location");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon) && typeof parsed.name === "string") {
        currentLoc = { ...DEFAULT_LOC, ...parsed };
        return;
      }
      console.warn("Stored location has invalid coordinates");
    } catch (err) {
      console.warn("Stored location parsing error:", err);
    }
  }
  currentLoc = { ...DEFAULT_LOC };
}

// Save location to LocalStorage
function saveLocation(loc) {
  currentLoc = loc;
  localStorage.setItem("weather_location", JSON.stringify(loc));
}

function resetWeatherStorage() {
  Object.keys(localStorage).forEach(key => {
    if (key === "weather_location" || key.startsWith(CACHE_PREFIX) || key.startsWith("weather_graphs_")) {
      localStorage.removeItem(key);
    }
  });
}

function isForecastCacheKey(key) {
  return key.startsWith(CACHE_PREFIX) &&
    (key.startsWith(`${CACHE_PREFIX}tide_`) || /^peheje_weather_-?\d/.test(key));
}

function pruneForecastCache(keepKey, maximumEntries = MAX_FORECAST_CACHE_ENTRIES) {
  const entries = Object.keys(localStorage)
    .filter(isForecastCacheKey)
    .map(key => {
      try {
        return { key, timestamp: JSON.parse(localStorage.getItem(key)).timestamp || 0 };
      } catch {
        return { key, timestamp: 0 };
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  entries.slice(maximumEntries).forEach(({ key }) => {
    if (key !== keepKey) localStorage.removeItem(key);
  });
}

function saveForecastCache(cacheKey, cacheData) {
  try {
    pruneForecastCache(cacheKey, MAX_FORECAST_CACHE_ENTRIES - 1);
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return true;
  } catch (err) {
    console.warn("Weather cache is full; evicting older entries", err);
    try {
      pruneForecastCache(cacheKey, 1);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (retryErr) {
      console.warn("Unable to save weather cache", retryErr);
      return false;
    }
  }
}

function getResponseExpiresAt(response, timestamp) {
  const cacheControl = response.headers?.get?.("cache-control") || "";
  const maxAge = cacheControl.match(/max-age=(\d+)/i);
  if (maxAge) return timestamp + Number(maxAge[1]) * 1000;

  const expiresHeader = response.headers?.get?.("expires");
  const expiresAt = expiresHeader ? Date.parse(expiresHeader) : NaN;
  return Number.isFinite(expiresAt) && expiresAt > timestamp ? expiresAt : timestamp + CACHE_EXPIRY_MS;
}

function numberAt(values, index) {
  const value = values?.[index];
  return Number.isFinite(value) ? value : null;
}

function normalizeOpenMeteoForecast(payload) {
  const hourly = payload?.hourly;
  if (!payload?.timezone || !Array.isArray(hourly?.time) || hourly.time.length === 0) {
    throw new Error("Open-Meteo returned an incomplete hourly forecast");
  }

  const timeseries = hourly.time.map((unixSeconds, index) => {
    if (!Number.isFinite(unixSeconds)) {
      throw new Error("Open-Meteo returned an invalid forecast timestamp");
    }

    // Open-Meteo assigns precipitation to the preceding hour. The chart
    // assigns a bar to the interval beginning at each point, so use the next
    // response value for the interval represented by this timestamp.
    const precipitationIndex = index + 1;
    const precipitation = numberAt(hourly.precipitation, precipitationIndex);
    const precipitationProbability = numberAt(hourly.precipitation_probability, precipitationIndex);
    const precipitationDetails = {};
    if (precipitation !== null) precipitationDetails.precipitation_amount = precipitation;
    if (precipitationProbability !== null) precipitationDetails.probability_of_precipitation = precipitationProbability;

    return {
      time: new Date(unixSeconds * 1000).toISOString(),
      data: {
        instant: {
          details: {
            air_temperature: numberAt(hourly.temperature_2m, index),
            ultraviolet_index: numberAt(hourly.uv_index, index),
            ultraviolet_index_clear_sky: numberAt(hourly.uv_index_clear_sky, index),
            cloud_area_fraction: numberAt(hourly.cloud_cover, index),
            cloud_area_fraction_low: numberAt(hourly.cloud_cover_low, index),
            cloud_area_fraction_medium: numberAt(hourly.cloud_cover_mid, index),
            cloud_area_fraction_high: numberAt(hourly.cloud_cover_high, index),
            wind_speed: numberAt(hourly.wind_speed_10m, index),
            wind_speed_of_gust: numberAt(hourly.wind_gusts_10m, index),
            wind_from_direction: numberAt(hourly.wind_direction_10m, index)
          }
        },
        next_1_hours: {
          summary: { symbol_code: getWeatherSymbolCode(numberAt(hourly.weather_code, index)) },
          details: precipitationDetails
        }
      }
    };
  });

  return {
    provider: "open-meteo",
    schemaVersion: 3,
    timezone: payload.timezone,
    properties: { timeseries }
  };
}

// Fetch a complete hourly forecast from Open-Meteo with local caching.
async function fetchWeather(lat, lon, forceRefresh = false, signal) {
  const cacheKey = `${CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached && !forceRefresh) {
    try {
      const parsed = JSON.parse(cached);
      const expiresAt = parsed.expiresAt || parsed.timestamp + CACHE_EXPIRY_MS;
      if (parsed.data?.provider === "open-meteo" && parsed.data?.schemaVersion === 3 && Date.now() < expiresAt) {
        parsed.data.lastUpdated = parsed.timestamp;
        parsed.data.expiresAt = expiresAt;
        return parsed.data;
      }
    } catch (err) {
      console.warn("Cached forecast parsing error:", err);
    }
  }

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: [
      "temperature_2m",
      "precipitation",
      "precipitation_probability",
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "uv_index",
      "uv_index_clear_sky",
      "weather_code"
    ].join(","),
    timezone: "auto",
    timeformat: "unixtime",
    wind_speed_unit: "ms",
    forecast_days: String(FORECAST_DAY_COUNT)
  });
  const url = `${OPEN_METEO_FORECAST_URL}?${params}`;
  let data;
  let expiresAt;
  try {
    const response = await fetch(url, { signal });
    
    if (!window.location) {
      throw new Error("Window unloaded");
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }

    data = normalizeOpenMeteoForecast(await response.json());
    expiresAt = getResponseExpiresAt(response, Date.now());
  } catch (err) {
    if (err.name === "AbortError") throw err;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.data?.provider === "open-meteo" && parsed.data?.schemaVersion === 3 && parsed.data?.properties?.timeseries) {
          parsed.data.lastUpdated = parsed.timestamp;
          parsed.data.expiresAt = parsed.expiresAt || parsed.timestamp + CACHE_EXPIRY_MS;
          parsed.data.isStale = true;
          return parsed.data;
        }
      } catch (cacheErr) {
        console.warn("Cached forecast fallback parsing error:", cacheErr);
      }
    }
    throw err;
  }

  // Save to cache
  const cacheData = {
    timestamp: Date.now(),
    expiresAt,
    data: data
  };
  saveForecastCache(cacheKey, cacheData);

  data.lastUpdated = cacheData.timestamp;
  data.expiresAt = expiresAt;
  return data;
}

// Fetch tide data from Open-Meteo Marine API with local caching
async function fetchTideData(lat, lon, signal) {
  const cacheKey = `${CACHE_PREFIX}tide_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (parsed.schemaVersion === TIDE_CACHE_SCHEMA_VERSION && age < CACHE_EXPIRY_MS) {
        return parsed.data;
      }
    } catch (err) {
      console.warn("Cached tide parsing error:", err);
    }
  }

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "sea_level_height_msl",
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: String(FORECAST_DAY_COUNT)
  });
  const url = `https://marine-api.open-meteo.com/v1/marine?${params}`;
  const response = await fetch(url, { signal });

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo Marine API returned status ${response.status}`);
  }

  const data = await response.json();
  const cacheData = {
    timestamp: Date.now(),
    schemaVersion: TIDE_CACHE_SCHEMA_VERSION,
    data: data
  };
  saveForecastCache(cacheKey, cacheData);
  return data;
}

// Get the weather timeseries data grouped for Today, Tomorrow, or future days
function getDailyTimeseriesRaw(timeseries, dayIndex) {
  const targetStr = getLocationDateString(getLocationDayDate(dayIndex));

  const hoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    uv: null,
    uvClearSky: null,
    temp: null,
    symbol: null,
    rain: null,
    rainMax: null,
    rainMin: null,
    rainProb: null,
    rainIntervalHours: null,
    clouds: null,
    cloudsLow: null,
    cloudsMid: null,
    cloudsHigh: null,
    windSpeed: null,
    windGust: null,
    windDir: null
  }));

  timeseries.forEach(item => {
    const itemDate = new Date(item.time);
    const dateStr = getLocationDateString(itemDate);
    if (dateStr === targetStr) {
      const hr = getLocationHour(itemDate);
      const details = item.data.instant.details;
      if (details) {
        hoursData[hr].uv = details.ultraviolet_index ?? null;
        hoursData[hr].uvClearSky = details.ultraviolet_index_clear_sky ?? null;
        hoursData[hr].temp = details.air_temperature;
        hoursData[hr].symbol = item.data.next_1_hours?.summary?.symbol_code || null;
        
        const oneHourRain = item.data.next_1_hours?.details;
        const rainDetails = oneHourRain;
        if (rainDetails && (rainDetails.precipitation_amount !== undefined || rainDetails.probability_of_precipitation !== undefined)) {
          hoursData[hr].rain = rainDetails.precipitation_amount ?? 0;
          hoursData[hr].rainMax = rainDetails.precipitation_amount_max ?? hoursData[hr].rain;
          hoursData[hr].rainMin = rainDetails.precipitation_amount_min ?? hoursData[hr].rain;
          hoursData[hr].rainProb = rainDetails.probability_of_precipitation ?? null;
          hoursData[hr].rainIntervalHours = 1;
        }

        hoursData[hr].clouds = details.cloud_area_fraction ?? null;
        hoursData[hr].cloudsLow = details.cloud_area_fraction_low ?? null;
        hoursData[hr].cloudsMid = details.cloud_area_fraction_medium ?? null;
        hoursData[hr].cloudsHigh = details.cloud_area_fraction_high ?? null;

        hoursData[hr].windSpeed = details.wind_speed ?? null;
        hoursData[hr].windGust = details.wind_speed_of_gust ?? null;
        hoursData[hr].windDir = details.wind_from_direction ?? null;
      }
    }
  });

  return hoursData;
}

function getDailyTimeseries(timeseries, dayIndex) {
  const hoursData = getDailyTimeseriesRaw(timeseries, dayIndex);
  rainMock?.applyForecast(hoursData, dayIndex);
  return { data: hoursData, displayData: hoursData, found: hoursData.some(h => h.temp !== null) };
}

// Chart hours are normally relative to a single day. Rolling views use this
// continuous timeline instead, allowing a chart to pass midnight naturally.
function getContinuousTimeseries(timeseries, finalDayIndex) {
  const points = [];
  for (let dayIndex = 0; dayIndex <= finalDayIndex; dayIndex++) {
    const { displayData } = getDailyTimeseries(timeseries, dayIndex);
    displayData.forEach(point => {
      points.push({
        ...point,
        hour: dayIndex * 24 + point.hour,
        localHour: point.hour,
        dayIndex
      });
    });
  }
  return points;
}

function getContinuousTideSeries(finalDayIndex) {
  const points = [];
  for (let dayIndex = 0; dayIndex <= finalDayIndex; dayIndex++) {
    getDailyTideSeries(tideData, dayIndex).data.forEach(point => {
      points.push({ ...point, hour: dayIndex * 24 + point.hour, localHour: point.hour, dayIndex });
    });
  }
  return points;
}

function getDailyTideSeriesRaw(tideData, dayIndex) {
  const targetStr = getLocationDateString(getLocationDayDate(dayIndex));

  const hoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: null
  }));

  if (!tideData || !tideData.hourly) {
    return hoursData;
  }

  const times = tideData.hourly.time;
  const values = tideData.hourly.sea_level_height_msl;

  for (let i = 0; i < times.length; i++) {
    const rawTime = times[i];
    const itemDate = typeof rawTime === "number"
      ? new Date(rawTime * 1000)
      : new Date(`${rawTime}${/[zZ]|[+-]\d{2}:\d{2}$/.test(rawTime) ? "" : "Z"}`);
    const dateStr = getLocationDateString(itemDate);
    if (dateStr === targetStr) {
      const hr = getLocationHour(itemDate);
      const val = values[i];
      if (val !== null && val !== undefined) {
        hoursData[hr].value = val * 100; // convert meters to centimeters
      }
    }
  }

  return hoursData;
}

function getDailyTideSeries(tideData, dayIndex) {
  const hoursData = getDailyTideSeriesRaw(tideData, dayIndex);
  return { data: hoursData, found: hoursData.some(h => h.value !== null) };
}

// Helper to get formatted day name and date
function getDayNameAndDate(i) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parts = getZonedParts(getLocationDayDate(i));
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const dayName = (i === 0) ? "Today" : ((i === 1) ? "Tomorrow" : daysOfWeek[weekday]);
  const dateStr = `${parts.day}/${parts.month}`;
  return `${dayName} ${dateStr}`;
}

function getForecastDayCount() {
  const timeseries = forecastData?.properties?.timeseries;
  if (!Array.isArray(timeseries) || timeseries.length === 0) return FORECAST_DAY_COUNT;

  const dates = new Set();
  timeseries.forEach(item => {
    if (item?.time) dates.add(getLocationDateString(new Date(item.time)));
  });

  let contiguousDays = 0;
  for (let dayIndex = 0; dayIndex < FORECAST_DAY_COUNT; dayIndex++) {
    const date = getLocationDateString(getLocationDayDate(dayIndex));
    if (!dates.has(date)) break;
    contiguousDays++;
  }
  return Math.max(1, contiguousDays);
}

function getRangeTabItems() {
  const forecastDays = getForecastDayCount();
  return RANGE_MODES.map(mode => {
    const disabled = mode.currentOnly
      ? activeTab !== 0
      : activeTab + mode.days > forecastDays;
    return {
      ...mode,
      key: mode.id,
      disabled,
      disabledLabel: disabled ? "This range is unavailable for the selected start date" : ""
    };
  });
}

function getAvailableRangeModes() {
  return getRangeTabItems().filter(mode => !mode.disabled);
}

function ensureRangeModeAvailable() {
  const available = getAvailableRangeModes();
  if (available.some(mode => mode.id === activeRangeMode)) return;

  const fallback = available.find(mode => mode.id === "day") || available[0];
  activeRangeMode = fallback?.id || "day";
}

function renderRangeTabs() {
  ensureRangeModeAvailable();
  rangeTabs.render(getRangeTabItems(), activeRangeMode);
}

function setRangeMode(nextMode) {
  const selected = getRangeTabItems().find(mode => mode.id === nextMode);
  if (!selected || selected.disabled) return false;

  activeRangeMode = selected.id;
  updateRangeUI();
  return true;
}

function getDayRangeCoverage(dayIndex) {
  const { start, end } = getZoomWindow();
  const dayStart = dayIndex * 24;
  const dayEnd = dayStart + 23;
  if (end < dayStart || start > dayEnd) return "outside";

  const isFull = start <= dayStart && end >= dayEnd;
  const classes = [isFull ? "range-covered-full" : "range-covered-partial"];
  if (!isFull && start > dayStart) classes.push("range-start");
  if (!isFull && end < dayEnd) classes.push("range-end");
  return classes.join(" ");
}

function updateDayRangeCoverage() {
  if (!dayTabsContainer) return;
  dayTabsContainer.querySelectorAll(".curve-tab").forEach(button => {
    const dayIndex = Number(button.dataset.key);
    button.classList.remove(
      "range-covered-full",
      "range-covered-partial",
      "range-start",
      "range-end"
    );
    const coverage = getDayRangeCoverage(dayIndex);
    if (coverage !== "outside") {
      coverage.split(" ").forEach(className => button.classList.add(className));
    }
    button.dataset.rangeCoverage = coverage;
  });
}

// Helper to update all prev-day and next-day buttons enabled state
function updateHeaderArrows() {
  const prevBtns = document.querySelectorAll(".prev-day");
  const nextBtns = document.querySelectorAll(".next-day");
  const finalDayIndex = getForecastDayCount() - 1;
  
  prevBtns.forEach(btn => {
    btn.disabled = (activeTab === 0);
  });
  nextBtns.forEach(btn => {
    btn.disabled = (activeTab >= finalDayIndex);
  });
}

// Helper to update all graph header date labels
function updateHeaderDates() {
  const { start, end } = getZoomWindow();
  const dateSpan = activeRangeMode === "day"
    ? getDayNameAndDate(activeTab)
    : `${getDayNameAndDate(Math.floor(start / 24))} → ${getDayNameAndDate(Math.floor((end - 0.001) / 24))}`;
  const dateLabels = document.querySelectorAll(".graph-date");
  dateLabels.forEach(el => {
    el.textContent = ` (${dateSpan})`;
  });
}

// Helper to trigger CSS slide transitions on canvases
function triggerGraphAnimation(direction) {
  const canvases = document.querySelectorAll(".canvas-container canvas");
  const animClass = direction === "next" ? "animate-slide-right" : "animate-slide-left";
  
  canvases.forEach(canvas => {
    if (!canvas) return;
    canvas.classList.remove("animate-slide-right", "animate-slide-left");
    // force reflow to restart animation
    void canvas.offsetWidth;
    canvas.classList.add(animClass);
  });
}

// Helper to transition active forecast day
function changeDay(newIndex) {
  if (newIndex < 0 || newIndex >= getForecastDayCount()) return;
  if (activeTab !== newIndex) {
    const direction = newIndex > activeTab ? "next" : "prev";
    activeTab = newIndex;

    // A rolling 12-hour focus is meaningful only for the current day. Once a
    // future day is selected, return to its complete calendar day rather than
    // carrying the current clock time into that future date.
    if (activeTab > 0 && activeRangeMode === "focus") {
      activeRangeMode = "day";
    }

    ensureRangeModeAvailable();
    dayTabs.setActive(String(activeTab));
    renderRangeTabs();

    // Sync header navigation arrows
    updateHeaderArrows();

    // Trigger visual transitions
    triggerGraphAnimation(direction);

    hoverHour = null;
    currentTimePinned = false;
    // Keep both tab bars, date labels, and graph data in sync after a day
    // change. The 12-hour mode may have been reset above.
    updateRangeUI();
  }
}

// Render every available start date in the shared forecast horizon.
function renderDayTabs() {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const forecastDays = getForecastDayCount();
  activeTab = Math.min(activeTab, forecastDays - 1);
  const items = [];
  for (let i = 0; i < forecastDays; i++) {
    const parts = getZonedParts(getLocationDayDate(i));
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    const dayName = (i === 0) ? "Today" : ((i === 1) ? "Tomorrow" : daysOfWeek[weekday]);
    const dateStr = `${parts.day}/${parts.month}`;
    const coverage = getDayRangeCoverage(i);
    items.push({
      key: i,
      label: `${dayName} ${dateStr}`,
      className: coverage === "outside" ? "" : coverage
    });
  }

  dayTabs.render(items, activeTab);
  renderRangeTabs();
  updateDayRangeCoverage();
}

// Calculate global min/max parameters over the entire forecast timeseries
function calculateGlobalLimits(timeseries) {
  let maxUV = 0;
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let maxRain = 0;
  let maxWind = 0;

  timeseries.forEach(item => {
    const details = item.data.instant.details;
    if (details) {
      const uv = details.ultraviolet_index || 0;
      if (uv > maxUV) maxUV = uv;
      const clearSkyUv = details.ultraviolet_index_clear_sky || 0;
      if (clearSkyUv > maxUV) maxUV = clearSkyUv;

      const temp = details.air_temperature;
      if (temp !== undefined && temp !== null) {
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
      }

      const wind = details.wind_speed;
      if (Number.isFinite(wind) && wind > maxWind) maxWind = wind;
      const windGust = details.wind_speed_of_gust;
      if (Number.isFinite(windGust) && windGust > maxWind) maxWind = windGust;
    }

    const rainDetails = item.data.next_1_hours?.details;
    if (rainDetails?.precipitation_amount !== undefined) {
      const rain = rainDetails.precipitation_amount;
      if (rain > maxRain) maxRain = rain;
    }
  });

  if (minTemp === Infinity) minTemp = 0;
  if (maxTemp === -Infinity) maxTemp = 10;

  globalLimits = {
    uvMax: maxUV,
    tempMin: minTemp,
    tempMax: maxTemp,
    rainMax: maxRain,
    windMax: maxWind
  };
}

// Update widgets UI with the current hourly forecast. The minute clock update
// only needs the summary and cursor; tabs and layout are rebuilt after loads.
function updateDashboardUI(data, fullRender = true) {
  const timeseries = data.properties.timeseries;
  
  if (fullRender) {
    calculateGlobalLimits(timeseries);
  }
  
  // Find current hour forecast
  const now = new Date();
  const currentTime = getLocationHourPosition(now);
  const currentHour = currentTime.hour;
  const todayStr = getLocationDateString(now);

  let currentForecast = null;

  for (const item of timeseries) {
    const itemDate = new Date(item.time);
    if (getLocationDateString(itemDate) === todayStr && getLocationHour(itemDate) === currentHour) {
      currentForecast = item;
      break;
    }
  }

  if (!currentForecast && timeseries.length > 0) {
    currentForecast = timeseries[0];
  }

  if (currentForecast) {
    const details = currentForecast.data.instant.details;

    // Match the graph's clicked Now value. Do not wrap 23:xx to tomorrow:
    // the Today graph holds its final hourly point through midnight.
    const nextHour = currentHour + 1;
    let nextForecast = null;
    if (nextHour < 24) {
      for (const item of timeseries) {
        const itemDate = new Date(item.time);
        if (getLocationDateString(itemDate) === todayStr && getLocationHour(itemDate) === nextHour) {
          nextForecast = item;
          break;
        }
      }
    }
    const currentValues = getSummaryWeatherValues(
      details,
      nextForecast?.data.instant.details,
      currentTime.fraction
    );
    const uvVal = currentValues.uv;
    const tempVal = currentValues.temp;
    
    const uvLevel = getUVLevel(uvVal);
    
    const uvCircle = document.getElementById("uv-circle");
    const uvValueEl = document.getElementById("uv-value");
    const uvLabelEl = document.getElementById("uv-label");
    const uvAdviceEl = document.getElementById("uv-advice");

    uvValueEl.textContent = uvVal.toFixed(1);
    uvLabelEl.textContent = uvLevel.label;
    
    uvCircle.className = "uv-hero-circle uv-circle-small " + uvLevel.class;
    uvAdviceEl.className = "uv-advice " + uvLevel.class;
    uvAdviceEl.textContent = uvLevel.advice;
    uvAdviceEl.style.borderLeftColor = "";

    const weatherEmoji = document.getElementById("weather-emoji");
    const tempValue = document.getElementById("temp-value");
    const weatherDesc = document.getElementById("weather-desc");
    const windValue = document.getElementById("wind-value");
    const windGustValue = document.getElementById("wind-gust-value");
    const precipValue = document.getElementById("precip-value");

    const symbolCode = currentForecast.data.next_1_hours?.summary?.symbol_code || null;
    const weather = getWeatherInfo(symbolCode);
    weatherEmoji.textContent = weather.emoji;
    tempValue.textContent = Number.isFinite(tempVal) ? `${tempVal.toFixed(1)}\u00B0C` : "--\u00B0C";
    weatherDesc.textContent = weather.desc;

    windValue.textContent = Number.isFinite(currentValues.windSpeed) ? `${currentValues.windSpeed.toFixed(1)} m/s` : "-- m/s";
    windGustValue.textContent = Number.isFinite(currentValues.windGust) ? `${currentValues.windGust.toFixed(1)} m/s` : "-- m/s";
    
    const precipDetails = currentForecast.data.next_1_hours?.details;
    const precip = precipDetails?.precipitation_amount;
    const precipProb = precipDetails?.probability_of_precipitation;
    if (precip === undefined && precipProb === undefined) {
      precipValue.textContent = "-- mm";
    } else if (precipProb !== undefined && precipProb !== null && precipProb > 0) {
      precipValue.textContent = `${(precip ?? 0).toFixed(1)} mm (${Math.round(precipProb)}%)`;
    } else {
      precipValue.textContent = `${(precip ?? 0).toFixed(1)} mm`;
    }
  }

  if (fullRender) {
    // Calculate Max UV Today
    const todayData = getDailyTimeseries(timeseries, 0).data;
    let maxUV = 0;
    let maxUVHour = 12;

    todayData.forEach(h => {
      if (h.uv > maxUV) {
        maxUV = h.uv;
        maxUVHour = h.hour;
      }
    });

    document.getElementById("uv-max").textContent = maxUV.toFixed(1);
    document.getElementById("uv-max-time").textContent = `${String(maxUVHour).padStart(2, '0')}:00`;

    renderDayTabs();
    drawForecastCurves();
    updateHeaderArrows();
    updateHeaderDates();

    if (data.lastUpdated) {
      const lastUpdatedEl = document.getElementById("last-updated");
      if (lastUpdatedEl) {
        const date = new Date(data.lastUpdated);
        const { hour, minute } = getZonedParts(date);
        const hours = String(hour).padStart(2, '0');
        const minutes = String(minute).padStart(2, '0');
        lastUpdatedEl.textContent = `Updated: ${hours}:${minutes}`;
      }
    }
  }
}

// Draw all forecast curves simultaneously
function drawForecastCurves() {
  if (!forecastData) return;

  const timeseries = forecastData.properties.timeseries;
  const { start, end } = getZoomWindow();
  const finalDayIndex = Math.max(activeTab, Math.ceil(end / 24));
  const dayPoints = getContinuousTimeseries(timeseries, finalDayIndex)
    .filter(point => point.hour >= Math.floor(start) && point.hour <= end);
  const found = dayPoints.some(point => point.temp !== null);
  if (!found) return;

  drawSingleCurve(uvCanvas, "uv", dayPoints);
  drawSingleCurve(tempCanvas, "temp", dayPoints);
  drawSingleCurve(rainCanvas, "rain", dayPoints);
  drawSingleCurve(windCanvas, "wind", dayPoints);

  const tidePoints = getContinuousTideSeries(finalDayIndex)
    .filter(point => point.hour >= Math.floor(start) && point.hour <= end);
  const tideFound = tidePoints.some(point => point.value !== null);
  drawSingleCurve(tideCanvas, "tide", tidePoints, tideFound);
  drawSingleCurve(cloudsCanvas, "clouds", dayPoints);
  drawSingleCurve(moonCanvas, "moon", dayPoints);
}

// Canvas rendering helper for a single curve parameters
function drawSingleCurve(canvas, paramType, dayPoints, dataFound = true) {
  if (!canvas) return;
  canvas.__currentValueHitTarget = null;
  canvas.classList.remove("current-value-pinned");
  if (window.__weatherTest) {
    canvas.__testPoints = dayPoints;
    canvas.__testAnnotations = {
      sunEvents: [],
      windArrowHours: [],
      dayBoundaryHours: []
    };
  }

  // Use native devicePixelRatio for ultra-sharp canvas rendering on high-density mobile displays.
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const newWidth = Math.floor(rect.width * dpr);
  const newHeight = Math.floor(rect.height * dpr);

  if (canvas.width !== newWidth || canvas.height !== newHeight) {
    canvas.width = newWidth;
    canvas.height = newHeight;
  }
  
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof ctx.setTransform !== "function") {
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;

  // Retrieve current active colors from page CSS
  const computedStyle = getComputedStyle(document.documentElement);
  const textColor = computedStyle.getPropertyValue("--text").trim() || "#f5ebe0";
  const mutedColor = computedStyle.getPropertyValue("--muted").trim() || "#c4a882";
  const gridColor = computedStyle.getPropertyValue("--line").trim() || "rgba(200, 160, 120, 0.15)";
  const accentColor = computedStyle.getPropertyValue("--accent").trim() || "#e8a045";
  const accent2Color = computedStyle.getPropertyValue("--accent-2").trim() || "#d4763a";
  const clearSkyUvColor = computedStyle.getPropertyValue("--uv-clear-sky").trim() || "#8a5a00";
  ctx.clearRect(0, 0, W, H);

  if (paramType === "moon") {
    renderMoonPhaseCard(ctx, W, H, computedStyle, textColor, mutedColor, accentColor);
    return;
  }

  if (!dataFound || !dayPoints) {
    ctx.save();
    ctx.fillStyle = mutedColor;
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("Forecast sea-level data is unavailable for this location", W / 2, H / 2 - 10);
    ctx.fillText("This model is not a local tide table", W / 2, H / 2 + 10);
    ctx.restore();
    return;
  }

  // Margins
  const paddingL = 38;
  const paddingR = paramType === "rain" ? 38 : 15;
  const paddingT = 25;
  const paddingB = 30;

  const graphW = W - paddingL - paddingR;
  const graphH = H - paddingT - paddingB;
  const rangeMode = getActiveRangeMode();

  // Coordinate setup depending on active parameter
  let minScaleY = 0;
  let maxScaleY = 10;
  let gridLevels = [];

  if (paramType === "uv") {
    const maxVal = globalLimits ? globalLimits.uvMax : Math.max(...dayPoints.map(p => p.uv), 0);
    maxScaleY = Math.max(10, Math.ceil(maxVal + 1));
    gridLevels = [0, 3, 6, 8, 11].filter(v => v <= maxScaleY);
    if (!gridLevels.includes(Math.floor(maxScaleY))) {
      gridLevels.push(Math.floor(maxScaleY));
    }
  } else if (paramType === "temp") {
    const temps = dayPoints.map(p => p.temp).filter(t => t !== null);
    const minT = globalLimits ? globalLimits.tempMin : (temps.length ? Math.min(...temps) : 0);
    const maxT = globalLimits ? globalLimits.tempMax : (temps.length ? Math.max(...temps) : 10);
    
    // Determine clean step size first based on raw temperature range
    const rawRange = maxT - minT;
    const step = rawRange > 35 ? 10 : 5;
    
    // Scale bounds directly to multiples of the selected step
    minScaleY = Math.floor(minT / step) * step;
    maxScaleY = Math.ceil(maxT / step) * step;
    if (minScaleY === maxScaleY) {
      maxScaleY += step;
    }
    
    // Generate grid levels matching the selected step size
    for (let val = minScaleY; val <= maxScaleY; val += step) {
      gridLevels.push(val);
    }
  } else if (paramType === "rain") {
    const knownRain = dayPoints.map(p => p.rain).filter(value => value !== null);
    const maxVal = rainMock
      ? Math.max(globalLimits?.rainMax || 0, rainMock.rainScaleMaximum)
      : (globalLimits ? globalLimits.rainMax : Math.max(...knownRain, 0));
    let step;
    if (maxVal > 20) {
      step = 10;
      maxScaleY = Math.ceil(maxVal / 10) * 10;
    } else if (maxVal > 10) {
      step = 5;
      maxScaleY = 20;
    } else if (maxVal > 5) {
      step = 2;
      maxScaleY = 10;
    } else if (maxVal > 2) {
      step = 1;
      maxScaleY = 5;
    } else {
      step = 0.5;
      maxScaleY = 2.0;
    }
    for (let val = 0; val <= maxScaleY; val += step) {
      gridLevels.push(val);
    }
  } else if (paramType === "wind") {
    const winds = dayPoints.map(p => p.windSpeed).filter(value => value !== null);
    const maxVal = (globalLimits && globalLimits.windMax !== undefined) ? globalLimits.windMax : Math.max(...winds, 0);
    minScaleY = 0;
    let step;
    if (maxVal > 20) {
      step = 5;
      maxScaleY = Math.ceil(maxVal / 5) * 5;
    } else if (maxVal > 10) {
      step = 4;
      maxScaleY = Math.ceil(maxVal / 4) * 4;
    } else if (maxVal > 8.5) {
      step = 2;
      maxScaleY = 10;
    } else if (maxVal > 6.0) {
      step = 2;
      maxScaleY = 8;
    } else {
      step = 2;
      maxScaleY = Math.max(4, Math.ceil(maxVal / 2) * 2);
    }
    for (let val = minScaleY; val <= maxScaleY; val += step) {
      gridLevels.push(val);
    }
  } else if (paramType === "tide") {
    const tides = dayPoints.map(p => p.value).filter(v => v !== null);
    const minTide = tides.length ? Math.min(...tides) : -100;
    const maxTide = tides.length ? Math.max(...tides) : 100;
    const range = maxTide - minTide;
    const step = range > 150 ? 50 : 25;
    minScaleY = Math.floor(minTide / step) * step;
    maxScaleY = Math.ceil(maxTide / step) * step;
    if (minScaleY === maxScaleY) {
      maxScaleY += step;
    }
    for (let val = minScaleY; val <= maxScaleY; val += step) {
      gridLevels.push(val);
    }
  } else if (paramType === "clouds") {
    minScaleY = 0;
    maxScaleY = 100;
    gridLevels = [0, 25, 50, 75, 100];
  }

  // Coordinate converter helpers
  const { start: viewStartHour, end: viewEndHour } = getZoomWindow();
  const getX = (hour) => {
    const range = viewEndHour - viewStartHour;
    return paddingL + ((hour - viewStartHour) / (range || 1)) * graphW;
  };
  const getY = (val) => {
    const norm = (val - minScaleY) / (maxScaleY - minScaleY);
    return H - paddingB - norm * graphH;
  };
  const getProbY = (prob) => {
    return H - paddingB - (Math.min(100, Math.max(0, prob)) / 100) * graphH;
  };

  // 1. Draw horizontal grid lines and labels
  ctx.save();
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = mutedColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  gridLevels.forEach(val => {
    const y = getY(val);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(paddingL, y);
    ctx.lineTo(W - paddingR, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.9)" : mutedColor;
    ctx.fillText(val, paddingL - 8, y);
  });
  ctx.restore();

  // Right Y-axis labels for Rain Chance (%)
  if (paramType === "rain") {
    ctx.save();
    ctx.fillStyle = "rgba(192, 132, 252, 0.9)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    [0, 50, 100].forEach(probVal => {
      const py = getProbY(probVal);
      ctx.fillText(`${probVal}%`, W - paddingR + 5, py);
    });
    ctx.restore();
  }

  // 2. Draw vertical time lines and labels
  ctx.save();
  ctx.fillStyle = mutedColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  
  let hoursToShow;
  if (activeRangeMode === "day") {
    hoursToShow = [0, 4, 8, 12, 16, 20, 23].map(hour => activeTab * 24 + hour);
  } else {
    const s = Math.ceil(viewStartHour);
    const e = Math.floor(viewEndHour);
    const interval = rangeMode.currentOnly
      ? 2
      : (rangeMode.hours <= 48 ? 6 : (rangeMode.hours <= 96 ? 12 : 24));
    const tickHours = new Set();
    for (let hr = s; hr <= e; hr++) {
      if (hr % interval === 0) {
        tickHours.add(hr);
      }
    }

    // Always keep midnight visible so multi-day views have clear day anchors.
    for (let hr = Math.ceil(viewStartHour / 24) * 24; hr <= e; hr += 24) {
      if (hr >= s) tickHours.add(hr);
    }
    hoursToShow = Array.from(tickHours).sort((a, b) => a - b);
  }

  hoursToShow.forEach(hr => {
    const x = getX(hr);
    const localHour = ((hr % 24) + 24) % 24;
    const isDayBoundary = localHour === 0 && activeRangeMode !== "day";
    const label = isDayBoundary
      ? getDayNameAndDate(Math.floor(hr / 24))
      : `${String(localHour).padStart(2, '0')}:00`;
    ctx.textAlign = x < paddingL + 35 ? "left" : (x > W - paddingR - 35 ? "right" : "center");
    ctx.fillText(label, x, H - paddingB + 8);
  });
  ctx.restore();

  // Build coordinate points using availability for the graph being rendered.
  const points = dayPoints.filter(p => {
    if (paramType === "tide") return p.value !== null;
    if (paramType === "rain") return p.rain !== null;
    if (paramType === "uv") return p.uv !== null;
    if (paramType === "wind") return p.windSpeed !== null;
    if (paramType === "clouds") return p.clouds !== null;
    return p.temp !== null;
  }).map(p => {
    let val = 0;
    if (paramType === "uv") val = p.uv;
    else if (paramType === "temp") val = p.temp;
    else if (paramType === "rain") val = p.rain;
    else if (paramType === "wind") val = p.windSpeed;
    else if (paramType === "tide") val = p.value;
    else if (paramType === "clouds") val = p.clouds;

    return {
      x: getX(p.hour),
      y: getY(val),
      val: val,
      uv: p.uv,
      uvClearSky: p.uvClearSky,
      temp: p.temp,
      rain: p.rain,
      rainMax: p.rainMax,
      rainMin: p.rainMin,
      rainProb: p.rainProb,
      rainIntervalHours: p.rainIntervalHours,
      clouds: p.clouds,
      cloudsLow: p.cloudsLow,
      cloudsMid: p.cloudsMid,
      cloudsHigh: p.cloudsHigh,
      windSpeed: p.windSpeed,
      windGust: p.windGust,
      windDir: p.windDir,
      hour: p.hour,
      symbol: p.symbol,
      tideValue: p.value
    };
  });

  if (points.length === 0) return;

  const clearSkyUvPoints = paramType === "uv"
    ? dayPoints
      .filter(point => point.uvClearSky !== null)
      .map(point => ({ x: getX(point.hour), y: getY(point.uvClearSky), hour: point.hour }))
    : [];

  const windGustPoints = paramType === "wind"
    ? dayPoints
      .filter(point => point.windGust !== null)
      .map(point => ({ x: getX(point.hour), y: getY(point.windGust), hour: point.hour }))
    : [];

  // Keep disconnected source ranges separate if a provider value is missing.
  const segments = [];
  points.forEach(point => {
    const previous = segments.at(-1)?.at(-1);
    if (!previous || point.hour !== previous.hour + 1) {
      segments.push([point]);
    } else {
      segments.at(-1).push(point);
    }
  });

  // Clip content area horizontally (between paddingL and W - paddingR)
  ctx.save();
  ctx.beginPath();
  ctx.rect(paddingL, 0, graphW, H);
  ctx.clip();

  if (paramType === "rain") {
    // ---- Draw Precipitation Bar Chart ----
    ctx.save();
    
    // Bar gradient fill
    const barGrad = ctx.createLinearGradient(0, paddingT, 0, H - paddingB);
    barGrad.addColorStop(0, "rgba(56, 178, 255, 0.85)"); // Vibrant blue
    barGrad.addColorStop(1, "rgba(56, 178, 255, 0.1)");
    
    ctx.fillStyle = barGrad;
    ctx.strokeStyle = "rgba(56, 178, 255, 0.9)";
    ctx.lineWidth = 1;

    points.forEach(p => {
      const y0 = getY(0);
      const y1 = p.y;
      const barH = y0 - y1;
      const intervalHours = p.rainIntervalHours || 1;
      const barW = Math.max(3, Math.abs(getX(p.hour + intervalHours) - getX(p.hour)) * 0.85);
      const barX = p.x + 1;
      if (barH > 0.5) {
        ctx.fillRect(barX, y1, barW, barH);
        ctx.strokeRect(barX, y1, barW, barH);
      }

      // Draw uncertainty error bars (whiskers) if rainMax is greater than rain
      if (p.rainMax !== undefined && p.rainMax > p.rain) {
        const yMax = getY(p.rainMax);
        const yMin = getY(p.rainMin || 0);

        ctx.save();
        ctx.strokeStyle = "rgba(56, 178, 255, 0.6)"; // semi-transparent blue for uncertainty
        ctx.lineWidth = 1.5;
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(barX + barW / 2, yMin);
        ctx.lineTo(barX + barW / 2, yMax);
        ctx.stroke();

        // Top horizontal cap
        ctx.beginPath();
        ctx.moveTo(barX + barW / 2 - 3, yMax);
        ctx.lineTo(barX + barW / 2 + 3, yMax);
        ctx.stroke();

        // Always show the lower cap, including at 0 mm, so the whisker
        // communicates a complete minimum-to-maximum range.
        ctx.beginPath();
        ctx.moveTo(barX + barW / 2 - 3, yMin);
        ctx.lineTo(barX + barW / 2 + 3, yMin);
        ctx.stroke();
        ctx.restore();
      }
    });
    ctx.restore();

    // ---- Draw Rain Chance (%) Overlay Curve ----
    const probPoints = points
      .filter(p => p.rainProb !== null && p.rainProb !== undefined)
      .map(p => {
        const intervalHours = p.rainIntervalHours || 1;
        const barW = Math.max(3, Math.abs(getX(p.hour + intervalHours) - getX(p.hour)) * 0.85);
        const cx = p.x + 1 + barW / 2;
        const cy = getProbY(p.rainProb);
        return { ...p, cx, cy };
      });

    if (probPoints.length > 0) {
      // Sleek dashed probability line
      ctx.save();
      ctx.strokeStyle = "rgba(192, 132, 252, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(probPoints[0].cx, probPoints[0].cy);
      for (let i = 0; i < probPoints.length - 1; i++) {
        const p0 = probPoints[i];
        const p1 = probPoints[i + 1];
        const xc = (p0.cx + p1.cx) / 2;
        const yc = (p0.cy + p1.cy) / 2;
        ctx.quadraticCurveTo(p0.cx, p0.cy, xc, yc);
      }
      if (probPoints.length > 1) {
        ctx.lineTo(probPoints.at(-1).cx, probPoints.at(-1).cy);
      }
      ctx.stroke();

      // Subtle node dots along the line
      ctx.fillStyle = "rgba(192, 132, 252, 0.9)";
      probPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.restore();
    }
  } else {
    // ---- Draw Curves for UV / Temperature ----
    // 3. Draw gradient area under the curve
    ctx.save();
    const fillGrad = ctx.createLinearGradient(0, paddingT, 0, H - paddingB);
    if (paramType === "uv") {
      fillGrad.addColorStop(0, "rgba(232, 160, 69, 0.35)");
      fillGrad.addColorStop(1, "rgba(232, 160, 69, 0.0)");
    } else if (paramType === "wind") {
      fillGrad.addColorStop(0, "rgba(0, 245, 212, 0.25)");
      fillGrad.addColorStop(1, "rgba(0, 245, 212, 0.0)");
    } else if (paramType === "tide") {
      fillGrad.addColorStop(0, "rgba(0, 180, 216, 0.25)");
      fillGrad.addColorStop(1, "rgba(0, 180, 216, 0.0)");
    } else if (paramType === "clouds") {
      fillGrad.addColorStop(0, "rgba(96, 165, 250, 0.25)");
      fillGrad.addColorStop(1, "rgba(96, 165, 250, 0.0)");
    } else { // temp
      fillGrad.addColorStop(0, "rgba(212, 90, 90, 0.3)"); // Reddish tint
      fillGrad.addColorStop(1, "rgba(212, 90, 90, 0.0)");
    }
    ctx.fillStyle = fillGrad;

    segments.filter(segment => segment.length > 1).forEach(segment => {
      ctx.beginPath();
      ctx.moveTo(segment[0].x, H - paddingB);
      ctx.lineTo(segment[0].x, segment[0].y);
      for (let i = 0; i < segment.length - 1; i++) {
        const p0 = segment[i];
        const p1 = segment[i + 1];
        const xc = (p0.x + p1.x) / 2;
        const yc = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
      }
      ctx.lineTo(segment.at(-1).x, segment.at(-1).y);
      ctx.lineTo(segment.at(-1).x, H - paddingB);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // Clear-sky UV is a reference ceiling: the solid curve remains the
    // cloud-adjusted forecast used by the current UV card and safety advice.
    if (paramType === "uv" && clearSkyUvPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = clearSkyUvColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(clearSkyUvPoints[0].x, clearSkyUvPoints[0].y);
      for (let i = 0; i < clearSkyUvPoints.length - 1; i++) {
        const point = clearSkyUvPoints[i];
        const nextPoint = clearSkyUvPoints[i + 1];
        if (nextPoint.hour !== point.hour + 1) {
          ctx.moveTo(nextPoint.x, nextPoint.y);
          continue;
        }
        const xc = (point.x + nextPoint.x) / 2;
        const yc = (point.y + nextPoint.y) / 2;
        ctx.quadraticCurveTo(point.x, point.y, xc, yc);
      }
      ctx.lineTo(clearSkyUvPoints.at(-1).x, clearSkyUvPoints.at(-1).y);
      ctx.stroke();
      ctx.restore();
    }

    if (paramType === "wind" && windGustPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(windGustPoints[0].x, windGustPoints[0].y);
      for (let i = 0; i < windGustPoints.length - 1; i++) {
        const point = windGustPoints[i];
        const nextPoint = windGustPoints[i + 1];
        if (nextPoint.hour !== point.hour + 1) {
          ctx.moveTo(nextPoint.x, nextPoint.y);
          continue;
        }
        const xc = (point.x + nextPoint.x) / 2;
        const yc = (point.y + nextPoint.y) / 2;
        ctx.quadraticCurveTo(point.x, point.y, xc, yc);
      }
      ctx.lineTo(windGustPoints.at(-1).x, windGustPoints.at(-1).y);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw curve line stroke
    ctx.save();
    const lineGrad = ctx.createLinearGradient(paddingL, 0, W - paddingR, 0);
    if (paramType === "uv") {
      lineGrad.addColorStop(0, accentColor);
      lineGrad.addColorStop(1, accent2Color);
    } else if (paramType === "wind") {
      lineGrad.addColorStop(0, "#00f5d4");
      lineGrad.addColorStop(1, "#00bbf9");
    } else if (paramType === "tide") {
      lineGrad.addColorStop(0, "#0077b6");
      lineGrad.addColorStop(1, "#00f5d4");
    } else if (paramType === "clouds") {
      lineGrad.addColorStop(0, "#60a5fa");
      lineGrad.addColorStop(1, "#94a3b8");
    } else { // temp
      lineGrad.addColorStop(0, "#38d4ff"); // Cool blue on left (night)
      lineGrad.addColorStop(0.5, accentColor); // Warm midday
      lineGrad.addColorStop(1, "#ff6b8b");  // Pinkish-red evening
    }
    
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    segments.forEach(segment => {
      ctx.save();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let i = 0; i < segment.length - 1; i++) {
        const p0 = segment[i];
        const p1 = segment[i + 1];
        const xc = (p0.x + p1.x) / 2;
        const yc = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
      }
      if (segment.length > 1) {
        ctx.lineTo(segment.at(-1).x, segment.at(-1).y);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Small circles identify provider-supplied hourly forecast values.
    ctx.save();
    ctx.fillStyle = lineGrad;
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.restore();
    ctx.restore();

    // Draw sunrise and sunset for every visible day. Labels stay on the first
    // visible day so longer ranges remain readable.
    if (paramType === "uv") {
      try {
        const firstVisibleDay = Math.floor(viewStartHour / 24);
        const finalVisibleDay = Math.floor(viewEndHour / 24);
        const drawSunEvent = (eventName, date, dayIndex, color, showLabel) => {
          if (!date || isNaN(date.getTime())) return;
          const parts = getZonedParts(date);
          const localHour = parts.hour + parts.minute / 60 + parts.second / 3600;
          const absoluteHour = dayIndex * 24 + localHour;
          const x = getX(absoluteHour);
          if (x < paddingL || x > W - paddingR) return;

          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, showLabel ? paddingT + 32 : paddingT);
          ctx.lineTo(x, H - paddingB);
          ctx.stroke();
          ctx.restore();

          if (window.__weatherTest) {
            canvas.__testAnnotations.sunEvents.push({
              type: eventName.toLowerCase(),
              dayIndex,
              labeled: showLabel
            });
          }
          if (!showLabel) return;

          ctx.save();
          ctx.fillStyle = textColor;
          ctx.font = "bold 9px sans-serif";
          const nearLeft = x < paddingL + 28;
          const nearRight = x > W - paddingR - 28;
          const labelX = nearLeft ? paddingL + 4 : (nearRight ? W - paddingR - 4 : x);
          ctx.textAlign = nearLeft ? "left" : (nearRight ? "right" : "center");
          ctx.textBaseline = "top";
          const timeStr = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
          ctx.fillText(eventName, labelX, paddingT + 5);
          ctx.fillText(timeStr, labelX, paddingT + 17);
          ctx.restore();
        };

        for (let dayIndex = firstVisibleDay; dayIndex <= finalVisibleDay; dayIndex++) {
          const targetDate = getLocationDayDate(dayIndex);
          const sunTimes = SunCalc.getTimes(targetDate, currentLoc.lat, currentLoc.lon);
          const showLabel = dayIndex === firstVisibleDay;
          drawSunEvent("Sunrise", sunTimes.sunrise, dayIndex, "rgba(234, 179, 8, 0.45)", showLabel);
          drawSunEvent("Sunset", sunTimes.sunset, dayIndex, "rgba(168, 85, 247, 0.45)", showLabel);
        }
      } catch (err) {
        console.error("Error drawing sunrise/sunset lines:", err);
      }
    }

    // 4b. Reduce wind-direction density as the visible range grows.
    if (paramType === "wind") {
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      const arrowInterval = rangeMode.hours <= 24
        ? 3
        : (rangeMode.hours <= 48 ? 6 : (rangeMode.hours <= 96 ? 12 : 24));

      points.forEach(p => {
        if (p.hour % arrowInterval === 0 && Number.isFinite(p.windDir)) {
          if (window.__weatherTest) {
            canvas.__testAnnotations.windArrowHours.push(p.hour);
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, 2 * Math.PI);
          ctx.fill();
          
          const rad = (p.windDir + 90) * Math.PI / 180;
          ctx.rotate(rad);
          
          const shaftLength = 12;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(shaftLength, 0);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(shaftLength - 4, -3);
          ctx.lineTo(shaftLength, 0);
          ctx.lineTo(shaftLength - 4, 3);
          ctx.stroke();
          
          ctx.restore();
        }
      });
      ctx.restore();
    }
  }

  // Draw day transitions above the data layer so filled curves and bars cannot
  // obscure them. Only boundaries inside a multi-day window are included.
  if (rangeMode.hours > 24) {
    ctx.save();
    ctx.strokeStyle = mutedColor;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    const firstBoundary = (Math.floor(viewStartHour / 24) + 1) * 24;
    for (let hour = firstBoundary; hour <= viewEndHour; hour += 24) {
      const x = getX(hour);
      ctx.beginPath();
      ctx.moveTo(x, paddingT);
      ctx.lineTo(x, H - paddingB);
      ctx.stroke();
      if (window.__weatherTest) {
        canvas.__testAnnotations.dayBoundaryHours.push(hour);
      }
    }
    ctx.restore();
  }

  // 5. Current hour vertical line indicator (shows the current minute via linear interpolation)
  const now = new Date();
  let currentTimeDec = null;
  if (activeTab === 0) {
    currentTimeDec = getLocationHourPosition(now).decimalHour;
    const h0 = Math.floor(currentTimeDec);
    const h1 = Math.min(23, h0 + 1);
    const curX = getX(currentTimeDec);

    if (currentTimeDec >= viewStartHour && currentTimeDec <= viewEndHour) {
      ctx.save();
      ctx.strokeStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.7)" : accentColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curX, paddingT);
      ctx.lineTo(curX, H - paddingB);
      ctx.stroke();
      ctx.restore();
    }

    const p0 = points.find(p => p.hour === h0);
    const p1 = points.find(p => p.hour === h1) || p0;

    if (p0) {
      const t = currentTimeDec - h0;
      const curY = p0.y + t * (p1.y - p0.y);

      ctx.save();
      ctx.fillStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.25)" : "rgba(232, 160, 69, 0.3)";
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = paramType === "rain" ? "#38d4ff" : accentColor;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      canvas.__currentValueHitTarget = {
        x: curX,
        y: curY,
        radius: 28
      };
    }
  }

  ctx.restore(); // End horizontal clipping!

  // 6. Draw the synchronized hover inspector, or current values when pinned.
  const isPinnedCurrent = hoverHour === null &&
    activeTab === 0 &&
    currentTimeDec !== null &&
    currentTimePinned;
  canvas.classList.toggle("current-value-pinned", isPinnedCurrent);
  const inspectorHour = hoverHour ?? (isPinnedCurrent ? currentTimeDec : null);
  if (inspectorHour !== null && inspectorHour >= viewStartHour && inspectorHour <= viewEndHour) {
    const h0 = Math.floor(inspectorHour);
    const h1 = isPinnedCurrent ? Math.min(23, h0 + 1) : h0 + 1;
    
    const p0 = points.find(p => p.hour === h0);
    const p1 = points.find(p => p.hour === h1) || p0;
    
    if (p0) {
      const t = inspectorHour - h0;
      
      const hpX = p0.x + t * (p1.x - p0.x);
      const hpY = p0.y + t * (p1.y - p0.y);
      const pinnedValues = getPinnedGraphWeatherValues(p0, p1, t);
      const hpVal = pinnedValues.value;
      const hpUv = pinnedValues.uv;
      const hpUvClearSky = pinnedValues.uvClearSky;
      const hpTemp = pinnedValues.temp;
      const hpRain = p0.rain !== null && p1.rain !== null ? p0.rain + t * (p1.rain - p0.rain) : p0.rain;
      const hpWindSpeed = pinnedValues.windSpeed;
      const hpWindGust = pinnedValues.windGust;
      const hpTideValue = p0.tideValue !== null && p1.tideValue !== null ? p0.tideValue + t * (p1.tideValue - p0.tideValue) : p0.tideValue;
      const hpClouds = p0.clouds + t * (p1.clouds - p0.clouds);
      const hpCloudsLow = p0.cloudsLow + t * (p1.cloudsLow - p0.cloudsLow);
      const hpCloudsMid = p0.cloudsMid + t * (p1.cloudsMid - p0.cloudsMid);
      const hpCloudsHigh = p0.cloudsHigh + t * (p1.cloudsHigh - p0.cloudsHigh);
      
      const hpRainProb = p0.rainProb !== null && p1.rainProb !== null ? Math.round(p0.rainProb + t * (p1.rainProb - p0.rainProb)) : p0.rainProb;
      const hpRainMin = p0.rainMin !== null && p1.rainMin !== null ? p0.rainMin + t * (p1.rainMin - p0.rainMin) : p0.rainMin;
      const hpRainMax = p0.rainMax !== null && p1.rainMax !== null ? p0.rainMax + t * (p1.rainMax - p0.rainMax) : p0.rainMax;

      const hp = {
        x: hpX,
        y: hpY,
        val: hpVal,
        uv: hpUv,
        uvClearSky: hpUvClearSky,
        temp: hpTemp,
        rain: hpRain,
        windSpeed: hpWindSpeed,
        windGust: hpWindGust,
        windDir: p0.windDir,
        tideValue: hpTideValue,
        clouds: hpClouds,
        cloudsLow: hpCloudsLow,
        cloudsMid: hpCloudsMid,
        cloudsHigh: hpCloudsHigh,
        hour: inspectorHour,
        symbol: p0.symbol,
        rainProb: hpRainProb,
        rainMin: hpRainMin,
        rainMax: hpRainMax,
        rainIntervalHours: p0.rainIntervalHours
      };

      // Dotted hover line
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hp.x, paddingT);
      ctx.lineTo(hp.x, H - paddingB);
      ctx.stroke();
      ctx.restore();

      // Hover highlighted dot
      ctx.save();
      ctx.fillStyle = paramType === "rain" ? "#38d4ff" : (paramType === "temp" ? "#ff6b8b" : (paramType === "wind" ? "#00f5d4" : accentColor));
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      if (paramType === "rain" && hp.rainProb !== null && hp.rainProb !== undefined) {
        const hpProbY = getProbY(hp.rainProb);
        ctx.fillStyle = "#c084fc";
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hp.x, hpProbY, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Parameter-specific tooltip box
      ctx.save();
      const tooltipLines = [];
      let boxColor = accentColor;

      const totalMinutes = Math.round(hp.hour * 60);
      const hh = Math.floor(totalMinutes / 60);
      const mm = totalMinutes % 60;
      const localHour = ((hh % 24) + 24) % 24;
      const timeStr = `${String(localHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const datePrefix = activeRangeMode === "day" ? "" : `${getDayNameAndDate(Math.floor(hh / 24))}, `;
      const timeLine = isPinnedCurrent ? `Now · ${timeStr}` : `Time: ${datePrefix}${timeStr}`;
      
      if (paramType === "uv") {
        const uvLevel = getUVLevel(hp.uv);
        boxColor = uvLevel.color;
        tooltipLines.push(timeLine);
        tooltipLines.push(`UV Index: ${hp.uv.toFixed(1)}`);
        if (hp.uvClearSky !== null) {
          tooltipLines.push(`Clear sky: ${hp.uvClearSky.toFixed(1)}`);
        }
        tooltipLines.push(`Level: ${uvLevel.label}`);
      } else if (paramType === "temp") {
        const emojiInfo = getWeatherInfo(hp.symbol);
        boxColor = "#ff6b8b";
        tooltipLines.push(timeLine);
        tooltipLines.push(`Temp: ${hp.temp !== null ? hp.temp.toFixed(1) : "--"}\u00B0C`);
        tooltipLines.push(`Weather: ${emojiInfo.emoji}`);
      } else if (paramType === "rain") {
        boxColor = "#38d4ff";
        tooltipLines.push(timeLine);
        const intervalLabel = hp.rainIntervalHours === 6 ? "next 6h" : "next hour";
        tooltipLines.push(`Interval: ${intervalLabel}`);
        tooltipLines.push(`Expected: ${hp.rain !== null ? hp.rain.toFixed(1) : "--"} mm`);
        if (hp.rainMax !== null && hp.rainMax !== undefined) {
          const rainMin = hp.rainMin ?? 0;
          tooltipLines.push(`Possible range: ${rainMin.toFixed(1)}–${hp.rainMax.toFixed(1)} mm`);
        }
        if (hp.rainProb !== null && hp.rainProb !== undefined) {
          tooltipLines.push(`Chance of rain: ${hp.rainProb}%`);
        }
      } else if (paramType === "wind") {
        boxColor = "#00f5d4";
        tooltipLines.push(timeLine);
        tooltipLines.push(`Wind: ${hp.windSpeed.toFixed(1)} m/s`);
        tooltipLines.push(`Gusts: ${hp.windGust !== null ? hp.windGust.toFixed(1) : "--"} m/s`);
        tooltipLines.push(`Direction: ${getWindDirectionLabel(hp.windDir)} (${hp.windDir}\u00B0)`);
      } else if (paramType === "tide") {
        boxColor = "#00b4d8";
        tooltipLines.push(timeLine);
        tooltipLines.push(`Forecast sea level: ${hp.tideValue !== null ? hp.tideValue.toFixed(1) : "--"} cm`);
      } else if (paramType === "clouds") {
        boxColor = "#38b2ff";
        tooltipLines.push(timeLine);
        tooltipLines.push(`Total Cloud Cover: ${hp.clouds.toFixed(0)}%`);
        tooltipLines.push(`Low Clouds: ${hp.cloudsLow.toFixed(0)}%`);
        tooltipLines.push(`Mid Clouds: ${hp.cloudsMid.toFixed(0)}%`);
        tooltipLines.push(`High Clouds: ${hp.cloudsHigh.toFixed(0)}%`);
      }

      ctx.font = "bold 11px sans-serif";
      let boxW = 120;
      tooltipLines.forEach(line => {
        const tw = ctx.measureText(line).width;
        if (tw + 20 > boxW) boxW = tw + 20;
      });
      const boxH = 10 + tooltipLines.length * 16;

      let boxX = hp.x + 12;
      if (boxX + boxW > W) {
        boxX = hp.x - boxW - 12;
      }
      let boxY = hp.y - boxH / 2;
      if (boxY < paddingT) {
        boxY = paddingT;
      } else if (boxY + boxH > H - paddingB) {
        boxY = H - paddingB - boxH;
      }

      // High-contrast, theme-appropriate background
      const tooltipBg = computedStyle.getPropertyValue("--surface-strong").trim() || "rgba(24, 18, 12, 0.95)";
      ctx.fillStyle = tooltipBg;
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      tooltipLines.forEach((line, idx) => {
        ctx.fillText(line, boxX + 10, boxY + 8 + idx * 16);
      });
      ctx.restore();
    }
  }

  // 7. Draw rolling-view indicator.
  if (activeRangeMode !== "day") {
    ctx.save();
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`🔍 ${getActiveRangeMode().label}`, W - paddingR - 4, paddingT - 18);
    ctx.restore();
  }
}

let startTouchDist = null;

function getActiveRangeMode() {
  return RANGE_MODES.find(mode => mode.id === activeRangeMode) || RANGE_MODES[1];
}

function stepZoom(towardLongerRange) {
  const rangeModes = getAvailableRangeModes();
  const currentLevel = rangeModes.findIndex(mode => mode.id === activeRangeMode);
  const safeCurrentLevel = currentLevel === -1 ? 0 : currentLevel;
  const nextLevel = Math.max(
    0,
    Math.min(rangeModes.length - 1, safeCurrentLevel + (towardLongerRange ? 1 : -1))
  );
  const nextMode = rangeModes[nextLevel];
  if (!nextMode || nextMode.id === activeRangeMode) return false;
  return setRangeMode(nextMode.id);
}

function getZoomWindow() {
  const rangeMode = getActiveRangeMode();
  const now = new Date();
  const nowParts = getZonedParts(now);
  const currentHour = nowParts.hour + nowParts.minute / 60 + nowParts.second / 3600;
  const dayStart = activeTab * 24;
  const anchor = rangeMode.currentOnly && activeTab === 0 ? currentHour : dayStart;

  if (rangeMode.currentOnly) {
    return { start: anchor, end: anchor + rangeMode.hours };
  }

  return { start: dayStart, end: dayStart + rangeMode.hours - 1 };
}

function updateRangeUI() {
  ensureRangeModeAvailable();
  rangeTabs.setActive(activeRangeMode);
  updateDayRangeCoverage();
  updateHeaderDates();
  drawForecastCurves();
}

function handleTouchStart(e) {
  if (!forecastData) return;
  
  if (e.touches.length === 2) {
    e.preventDefault();
    startTouchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  } else if (e.touches.length === 1) {
    handleCanvasHover(e);
  }
}

function handleTouchMove(e) {
  if (!forecastData) return;

  if (e.touches.length === 2 && startTouchDist !== null) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    
    const ratio = dist / startTouchDist;
    
    if (ratio > 1.25) { // Fingers spread apart -> move toward a shorter range
      if (stepZoom(false)) {
        startTouchDist = dist;
      }
    } else if (ratio < 0.8) { // Fingers pinch together -> move toward a longer range
      if (stepZoom(true)) {
        startTouchDist = dist;
      }
    }
  } else if (e.touches.length === 1) {
    handleCanvasHover(e);
  }
}

function handleTouchEnd(e) {
  if (e.touches.length === 0) {
    startTouchDist = null;
    handleCanvasLeave();
  }
}

function handleCanvasWheel(e) {
  if (!forecastData) return;
  
  // Only zoom if a modifier key (Ctrl, Cmd, Alt, Shift) is held down
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    return;
  }
  
  e.preventDefault();
  
  if (e.deltaY < 0) { // Scroll up -> shorter time range
    stepZoom(false);
  } else if (e.deltaY > 0) { // Scroll down -> longer time range
    stepZoom(true);
  }
  
  handleCanvasHover(e);
}

// Track hover coordinates on canvas
function handleCanvasHover(e) {
  if (!forecastData) return;

  const clearedCurrentPin = currentTimePinned;
  currentTimePinned = false;
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (!touch) {
    const target = canvas.__currentValueHitTarget;
    const nearCurrentDot = target && Math.hypot(x - target.x, y - target.y) <= target.radius;
    canvas.style.cursor = nearCurrentDot ? "pointer" : "crosshair";
  }

  const paddingL = 38;
  const paddingR = 15;
  const graphW = rect.width - paddingL - paddingR;

  const { start: viewStartHour, end: viewEndHour } = getZoomWindow();
  const relativeX = x - paddingL;
  const range = viewEndHour - viewStartHour;
  let hr = viewStartHour + (relativeX / graphW) * range;
  if (activeRangeMode === "day") {
    hr = Math.round(hr);
  }
  hr = Math.max(viewStartHour, Math.min(viewEndHour, hr));

  if (hoverHour !== hr || clearedCurrentPin) {
    hoverHour = hr;
    scheduleForecastDraw();
  }
}

function handleCanvasLeave() {
  if (hoverHour !== null) {
    hoverHour = null;
    scheduleForecastDraw();
  }
}

function togglePinnedCurrent(canvas) {
  const target = canvas.__currentValueHitTarget;
  if (!target || activeTab !== 0) return;
  currentTimePinned = !currentTimePinned;
  hoverHour = null;
  scheduleForecastDraw();
}

function handleCanvasClick(e) {
  const canvas = e.currentTarget;
  const target = canvas.__currentValueHitTarget;
  if (!target || activeTab !== 0) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (Math.hypot(x - target.x, y - target.y) <= target.radius) {
    togglePinnedCurrent(canvas);
  } else if (currentTimePinned) {
    currentTimePinned = false;
    scheduleForecastDraw();
  }
}

function handleCanvasKeydown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (!e.currentTarget.__currentValueHitTarget || activeTab !== 0) return;
  e.preventDefault();
  togglePinnedCurrent(e.currentTarget);
}

// Fetch forecast and refresh page
async function loadWeatherData(lat, lon, name, silent = false, isGps = false, forceRefresh = false, locationIntent = ++locationIntentId) {
  if (locationIntent !== locationIntentId) return;
  const loadId = ++weatherLoadId;
  if (weatherLoadController) weatherLoadController.abort();
  if (tideLoadController) tideLoadController.abort();
  const controller = new AbortController();
  weatherLoadController = controller;

  showError("");
  if (!silent) {
    setLoaderState(true);
  }
  try {
    const nextForecast = await fetchWeather(lat, lon, forceRefresh, controller.signal);
    const timeZone = nextForecast.timezone || currentLoc.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (!window.location || loadId !== weatherLoadId || locationIntent !== locationIntentId) return;

    forecastData = nextForecast;
    
    currentLoc = { lat, lon, name, isGps, timeZone };
    saveLocation(currentLoc);

    locationDisplay.textContent = name;
    if (gpsBadge) {
      gpsBadge.style.display = isGps ? "inline-flex" : "none";
    }
    coordinatesDisplay.textContent = `(${lat.toFixed(2)}, ${lon.toFixed(2)})`;

    // Windy is only loaded when its card is visible; otherwise its map/WebGL
    // animation is kept fully unloaded.
    radarSource = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=8&level=surface&overlay=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
    updateRadarResource();

    if (!silent) {
      setLoaderState(false);
    }
    updateDashboardUI(forecastData);
    if (forecastData.isStale) {
      showError("Showing the most recently cached forecast because the live forecast service is unavailable.");
    }

    // Fetch tide data independently in the background
    tideData = null;
    if (!isHappyDOM()) {
      const tideController = new AbortController();
      tideLoadController = tideController;
      fetchTideData(lat, lon, tideController.signal).then(data => {
        if (tideLoadController === tideController) tideLoadController = null;
        if (loadId !== weatherLoadId || locationIntent !== locationIntentId) return;
        tideData = data;
        drawForecastCurves();
      }).catch(err => {
        if (tideLoadController === tideController) tideLoadController = null;
        if (err.name === "AbortError" || loadId !== weatherLoadId || locationIntent !== locationIntentId) return;
        console.warn("Failed to load tide data in background:", err);
        tideData = null;
        drawSingleCurve(tideCanvas, "tide", null, false);
      });
    } else {
      drawSingleCurve(tideCanvas, "tide", null, false);
    }

  } catch (err) {
    if (!window.location || err.message === "Window unloaded" || err.name === "AbortError" || loadId !== weatherLoadId || locationIntent !== locationIntentId) return;
    console.error(err);
    showError(`Error loading weather forecast: ${err.message}. Please check connection.`);
    setLoaderState(false);
  } finally {
    if (loadId === weatherLoadId) {
      weatherLoadController = null;
    }
  }
}

// Nominatim Geocoding implementation
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  if (query === "/reset") {
    resetWeatherStorage();
    location.reload();
    return;
  }

  const queryKey = query.toLocaleLowerCase();
  if (geocodeCache.has(queryKey)) {
    displaySuggestions(geocodeCache.get(queryKey));
    return;
  }

  const elapsed = Date.now() - lastSearchAt;
  if (elapsed < 1000) {
    showError("Please wait a moment before another city search.");
    return;
  }

  if (searchController) searchController.abort();
  const requestId = ++searchRequestId;
  const controller = new AbortController();
  searchController = controller;
  lastSearchAt = Date.now();

  try {
    const url = `${GEOCODING_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Search service failed");
    
    const results = await response.json();
    if (requestId !== searchRequestId) return;
    geocodeCache.set(queryKey, results);
    if (geocodeCache.size > 20) geocodeCache.delete(geocodeCache.keys().next().value);
    displaySuggestions(results);
  } catch (err) {
    if (err.name === "AbortError" || requestId !== searchRequestId) return;
    console.error(err);
    showError("Could not retrieve search suggestions. Please try again.");
  } finally {
    if (requestId === searchRequestId) searchController = null;
  }
}

function displaySuggestions(items) {
  suggestionsList.innerHTML = "";
  if (items.length === 0) {
    suggestionsList.style.display = "none";
    searchInput.setAttribute("aria-expanded", "false");
    return;
  }

  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.setAttribute("role", "option");
    
    const parts = item.display_name.split(",");
    const shortName = parts.slice(0, 3).join(",");
    button.textContent = shortName;

    button.addEventListener("click", () => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      searchInput.value = shortName;
      suggestionsList.style.display = "none";
      searchInput.setAttribute("aria-expanded", "false");
      loadWeatherData(lat, lon, shortName);
    });

    suggestionsList.append(button);
  });

  suggestionsList.style.display = "block";
  searchInput.setAttribute("aria-expanded", "true");
}

// Geolocation GPS fetcher
function getGPSLocation() {
  if (!navigator.geolocation) {
    showError("GPS geolocation is not supported by your browser.");
    return;
  }

  showError("");
  const gpsIntent = ++locationIntentId;
  navigator.geolocation.getCurrentPosition(
    async position => {
      if (gpsIntent !== locationIntentId) return;
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      let locName = "GPS Location";
      try {
        const response = await fetch(`${GEOCODING_URL}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`);
        if (response.ok) {
          const data = await response.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || addr.state;
          if (city) {
            locName = city;
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding failed", err);
      }
      
      if (gpsIntent === locationIntentId) {
        loadWeatherData(lat, lon, locName, false, true, false, gpsIntent);
      }
    },
    err => {
      if (gpsIntent !== locationIntentId) return;
      console.warn("GPS Location error", err);
      let errMsg = "Could not access location.";
      if (err.code === 1) errMsg = "GPS permission denied.";
      else if (err.code === 2) errMsg = "Position unavailable.";
      showError(errMsg + " Using default location.");
      
      loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, false, currentLoc.isGps, false, gpsIntent);
    },
    { timeout: 8000 }
  );
}

// Tab handlers
function setupTabs() {
  // Tabs are dynamically handled inside renderDayTabs
}

// Setup Graph Headers and swipe navigation
function setupHeaderNavigation() {
  const headers = document.querySelectorAll(".graph-header");
  headers.forEach(header => {
    const prevBtn = header.querySelector(".prev-day");
    const nextBtn = header.querySelector(".next-day");

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        changeDay(activeTab - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        changeDay(activeTab + 1);
      });
    }

    // Touch swipe gesture handling on header (ignoring the arrow buttons)
    let touchStartX = 0;
    let touchEndX = 0;

    header.addEventListener("touchstart", (e) => {
      if (e.target.closest(".nav-arrow")) {
        touchStartX = 0; // invalidate
        return;
      }
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    header.addEventListener("touchend", (e) => {
      if (touchStartX === 0 || e.target.closest(".nav-arrow")) {
        return;
      }
      touchEndX = e.changedTouches[0].screenX;
      
      const threshold = 60; // minimum swipe distance in pixels
      if (touchEndX < touchStartX - threshold) {
        // Swiped left -> Next Day
        changeDay(activeTab + 1);
      } else if (touchEndX > touchStartX + threshold) {
        // Swiped right -> Previous Day
        changeDay(activeTab - 1);
      }
    }, { passive: true });
  });

  updateHeaderArrows();
}

// Save current graph cards layout order to LocalStorage
function saveLayoutOrder() {
  const cards = Array.from(document.querySelectorAll(".graphs-grid .graph-card"));
  const order = cards.map(c => c.getAttribute("data-key"));
  localStorage.setItem("weather_graphs_order", JSON.stringify(order));
}

// Restore saved graph cards layout order from LocalStorage
function restoreLayoutOrder() {
  const stored = localStorage.getItem("weather_graphs_order");
  if (stored) {
    try {
      const order = JSON.parse(stored);
      const container = document.querySelector(".graphs-grid");
      if (!container) return;
      const cards = Array.from(container.querySelectorAll(".graph-card"));
      const cardMap = new Map(cards.map(c => [c.getAttribute("data-key"), c]));
      
      order.forEach(key => {
        const card = cardMap.get(key);
        if (card) {
          container.appendChild(card);
        }
      });
      // Append any remaining cards that weren't in the saved order list
      cards.forEach(card => {
        if (!order.includes(card.getAttribute("data-key"))) {
          container.appendChild(card);
        }
      });
    } catch (e) {
      console.warn("Failed to restore layout order:", e);
    }
  }
}

// Save minimized states of graph cards to LocalStorage
function saveMinimizedStates() {
  const states = {};
  document.querySelectorAll(".graphs-grid .graph-card").forEach(card => {
    const key = card.getAttribute("data-key");
    states[key] = card.classList.contains("minimized");
  });
  localStorage.setItem("weather_graphs_minimized", JSON.stringify(states));
}

// Update the hidden curves bar with pills
function updateHiddenCurvesBar() {
  const bar = document.getElementById("hidden-curves-bar");
  const pillsContainer = document.getElementById("hidden-curves-pills");
  if (!bar || !pillsContainer) return;

  pillsContainer.innerHTML = "";
  let anyHidden = false;

  document.querySelectorAll(".graphs-grid .graph-card").forEach(card => {
    const key = card.getAttribute("data-key");
    if (card.classList.contains("minimized")) {
      anyHidden = true;
      
      const titleEl = card.querySelector(".curve-title");
      let title = key;
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        const dateEl = clone.querySelector(".graph-date");
        if (dateEl) dateEl.remove();
        title = clone.textContent.trim();
      }

      const pill = document.createElement("button");
      pill.className = "hidden-curve-pill";
      pill.style.cssText = "display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 0.7rem; border-radius: 12px; background: var(--bg-soft); border: 1px dashed var(--muted); color: var(--text); cursor: pointer; transition: all 0.2s; font-weight: 500; line-height: 1.2;";
      pill.innerHTML = `<span>+ ${title}</span>`;
      
      pill.onmouseover = () => {
        pill.style.borderColor = "var(--accent)";
        pill.style.color = "var(--accent)";
        pill.style.background = "var(--nav-hover-bg)";
      };
      pill.onmouseout = () => {
        pill.style.borderColor = "var(--muted)";
        pill.style.color = "var(--text)";
        pill.style.background = "var(--bg-soft)";
      };

      pill.addEventListener("click", () => {
        card.classList.remove("minimized");
        saveMinimizedStates();
        updateHiddenCurvesBar();
        updateRadarResource();
        drawForecastCurves();
      });

      pillsContainer.appendChild(pill);
    }
  });

  bar.style.display = anyHidden ? "flex" : "none";
}

// Restore minimized states of graph cards from LocalStorage
function restoreMinimizedStates() {
  const stored = localStorage.getItem("weather_graphs_minimized");
  if (stored) {
    try {
      const states = JSON.parse(stored);
      document.querySelectorAll(".graphs-grid .graph-card").forEach(card => {
        const key = card.getAttribute("data-key");
        if (states[key]) {
          card.classList.add("minimized");
        }
      });
    } catch (e) {
      console.warn("Failed to restore minimized states:", e);
    }
  }
  updateHiddenCurvesBar();
}

// Setup context menu (right click & long press) on graph headers
function setupHeaderContextMenu() {
  const cards = document.querySelectorAll(".graphs-grid .graph-card");
  
  cards.forEach(card => {
    const header = card.querySelector(".graph-header");
    if (!header) return;

    let touchTimer = null;
    let didTriggerLongPress = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTrigger = (x, y) => {
      showContextMenu(x, y, card);
    };

    // Reset long press flag on desktop mousedown
    header.addEventListener("mousedown", () => {
      didTriggerLongPress = false;
    });

    // Right-click for desktop (and some mobile native long-press)
    header.addEventListener("contextmenu", (e) => {
      const isButton = e.target.closest("button");
      if (isButton) return;
      e.preventDefault();
      
      const isTouch = (touchTimer !== null);
      clearTimeout(touchTimer); // Prevent the custom touch timer from firing if native contextmenu fired first
      touchTimer = null;

      if (didTriggerLongPress) return; // Prevent double trigger
      
      if (isTouch) {
        didTriggerLongPress = true;
      }
      handleTrigger(e.clientX, e.clientY);
    });

    // Long-press for mobile
    header.addEventListener("touchstart", (e) => {
      const isButton = e.target.closest("button");
      if (isButton) return;
      
      didTriggerLongPress = false;
      clearTimeout(touchTimer);
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      touchTimer = setTimeout(() => {
        if (didTriggerLongPress) return;
        didTriggerLongPress = true;
        if (navigator.vibrate) {
          try { navigator.vibrate(50); } catch { /* Vibration is optional. */ }
        }
        handleTrigger(touchStartX, touchStartY);
      }, 600); // 600ms threshold
    }, { passive: true });

    header.addEventListener("touchend", (e) => {
      clearTimeout(touchTimer);
      touchTimer = null;
      if (didTriggerLongPress) {
        if (e.cancelable !== false) {
          e.preventDefault();
        }
        didTriggerLongPress = false;
      }
    });

    header.addEventListener("touchmove", (e) => {
      if (didTriggerLongPress) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      // Cancel timer if finger moves significantly
      if (dx > 15 || dy > 15) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    header.addEventListener("touchcancel", () => {
      clearTimeout(touchTimer);
      touchTimer = null;
    });
  });
}

// Show the floating context menu at x, y coordinates
function showContextMenu(x, y, card) {
  // Remove existing menu if any
  const existing = document.querySelector(".weather-context-menu");
  if (existing) {
    existing.remove();
  }

  const key = card.getAttribute("data-key");
  const parent = card.parentNode;
  const cardsArray = Array.from(parent.querySelectorAll(".graph-card"));
  const index = cardsArray.indexOf(card);

  const menu = document.createElement("div");
  menu.className = "weather-context-menu";

  // Move Up Button
  const btnUp = document.createElement("button");
  btnUp.textContent = "↑ Up";
  if (index === 0) {
    btnUp.disabled = true;
  } else {
    btnUp.addEventListener("click", () => {
      const prev = cardsArray[index - 1];
      parent.insertBefore(card, prev);
      saveLayoutOrder();
      drawForecastCurves();
      menu.remove();
    });
  }
  menu.appendChild(btnUp);

  // Move Down Button
  const btnDown = document.createElement("button");
  btnDown.textContent = "↓ Down";
  if (index === cardsArray.length - 1) {
    btnDown.disabled = true;
  } else {
    btnDown.addEventListener("click", () => {
      const next = cardsArray[index + 1];
      parent.insertBefore(card, next.nextSibling);
      saveLayoutOrder();
      drawForecastCurves();
      menu.remove();
    });
  }
  menu.appendChild(btnDown);

  // Hide/Show Button
  const isMinimized = card.classList.contains("minimized");
  const btnToggle = document.createElement("button");
  btnToggle.textContent = isMinimized ? "Show" : "Hide";
  btnToggle.addEventListener("click", () => {
    card.classList.toggle("minimized");
    saveMinimizedStates();
    updateHiddenCurvesBar();
    updateRadarResource();
    drawForecastCurves();
    menu.remove();
  });
  menu.appendChild(btnToggle);

  // Source Attribution (Unclickable Button)
  const CARD_SOURCES = {
    temp: "Open-Meteo",
    precip: "Open-Meteo",
    clouds: "Open-Meteo",
    uv: "Open-Meteo",
    wind: "Open-Meteo",
    tide: "Open-Meteo Marine (forecast sea level)",
    moon: "Local Calculation",
    radar: "Windy"
  };
  const sourceName = CARD_SOURCES[key] || "Unknown";
  const btnSource = document.createElement("button");
  btnSource.textContent = `Source: ${sourceName}`;
  btnSource.disabled = true;
  btnSource.style.borderTop = "1px solid var(--line)";
  btnSource.style.paddingTop = "8px";
  btnSource.style.marginTop = "4px";
  btnSource.style.fontWeight = "600";
  menu.appendChild(btnSource);

  // Position the menu relative to the header to lock its placement
  const header = card.querySelector(".graph-header");
  const rect = header ? header.getBoundingClientRect() : { left: x, top: y, width: 0, height: 0, bottom: y };
  
  const menuWidth = 120;
  const menuHeight = 145;
  
  let left = rect.left + rect.width / 2 - menuWidth / 2;
  let top = rect.bottom + 5;

  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 10;
  }
  if (left < 10) {
    left = 10;
  }
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 5;
  }
  if (top < 10) {
    top = 10;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  document.body.appendChild(menu);

  // Close menu on click or touch outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("contextmenu", closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("click", closeMenu);
    document.addEventListener("contextmenu", closeMenu);
  }, 0);
}

function initWeatherPage() {
  // Hidden developer reset command via URL parameter
  if (new URLSearchParams(window.location.search).has("reset")) {
    resetWeatherStorage();
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    const isHappyDOM = window.happyDOM || (navigator && navigator.userAgent && /happy-dom|happydom/i.test(navigator.userAgent));
    if (!isHappyDOM) {
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }

  // Mount the site layout shell
  mountSiteShell();

  // Restore layout order & minimized states
  restoreLayoutOrder();
  restoreMinimizedStates();
  setupHeaderContextMenu();
  setupRadarLifecycle();
  // Load last stored location if any
  loadStoredLocation();

  // Initial data load uses a fresh cache immediately and refreshes only once
  // the provider's expiry has passed.
  loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, false, currentLoc.isGps);

  // Setup tab switches
  setupTabs();

  // Setup header chevron click and swipe day navigation
  setupHeaderNavigation();

  // GPS Click handler
  locationBtn.addEventListener("click", getGPSLocation);

  // Search button click handler
  searchBtn.addEventListener("click", performSearch);

  // Search enter handler
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  });

  // Nominatim's public service does not permit autocomplete. Clear stale
  // suggestions while the user changes the query; requests happen only after
  // an explicit Search click or Enter key.
  searchInput.addEventListener("input", () => {
    suggestionsList.style.display = "none";
    searchInput.setAttribute("aria-expanded", "false");
  });

  // Hide suggestions if clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsList.style.display = "none";
      searchInput.setAttribute("aria-expanded", "false");
    }
  });

  // Redraw canvases on resize, coalesced with hover/theme draw requests.
  window.addEventListener("resize", () => {
    scheduleForecastDraw();
  });

  // Bind synced mouse/touch event listeners across all canvases
  [uvCanvas, tempCanvas, rainCanvas, windCanvas, tideCanvas, cloudsCanvas].forEach(canvas => {
    if (!canvas) return;
    canvas.addEventListener("mousemove", handleCanvasHover);
    canvas.addEventListener("mouseleave", handleCanvasLeave);
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("keydown", handleCanvasKeydown);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    
    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  });

  // Redraw canvases if active page theme is toggled
  const themeObserver = new MutationObserver(() => {
    scheduleForecastDraw();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Check freshness infrequently. The minute clock below keeps the current
  // cursor moving without turning it into a network refresh.
  setInterval(() => {
    refreshForecastIfStale();
  }, 15 * 60 * 1000);
  scheduleClockTick();

  // Unload heavy radar work while hidden, then update the time cursor and
  // refresh only if the stored provider expiry has passed.
  document.addEventListener("visibilitychange", () => {
    updateRadarResource();
    if (document.visibilityState === "visible") {
      if (forecastData) {
        updateDashboardUI(forecastData, false);
        scheduleForecastDraw();
      }
      refreshForecastIfStale();
    }
    scheduleClockTick();
  });
}

// Calculate moon phase parameters for a given date
function getMoonPhase(date) {
  const referenceNewMoon = new Date("2000-01-06T18:14:00Z");
  const synodicMonth = 29.530588853;
  const diffMs = date.getTime() - referenceNewMoon.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const phaseFraction = (diffDays / synodicMonth) % 1;
  const normalizedFraction = phaseFraction < 0 ? phaseFraction + 1 : phaseFraction;
  const age = normalizedFraction * synodicMonth;
  
  let name;
  let emoji;
  if (age < 1.38 || age > 28.15) {
    name = "New Moon";
    emoji = "🌑";
  } else if (age < 6.0) {
    name = "Waxing Crescent";
    emoji = "🌒";
  } else if (age < 8.76) {
    name = "First Quarter";
    emoji = "🌓";
  } else if (age < 13.38) {
    name = "Waxing Gibbous";
    emoji = "🌔";
  } else if (age < 16.15) {
    name = "Full Moon";
    emoji = "🌕";
  } else if (age < 20.77) {
    name = "Waning Gibbous";
    emoji = "🌖";
  } else if (age < 23.53) {
    name = "Third Quarter";
    emoji = "🌗";
  } else {
    name = "Waning Crescent";
    emoji = "🌘";
  }
  
  const illumination = (1 - Math.cos(normalizedFraction * 2 * Math.PI)) / 2;
  
  return {
    fraction: normalizedFraction,
    age: age,
    illumination: illumination,
    name: name,
    emoji: emoji
  };
}

// Draw a moon sphere graphic on canvas representing the phase
function drawMoonGraphic(ctx, cx, cy, R, norm, darkMoonBg, darkMoonBorder, lightMoonBg) {
  // 1. Draw full dark background circle (representing the unlit part of the moon)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fillStyle = darkMoonBg;
  ctx.strokeStyle = darkMoonBorder;
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  
  // 2. Draw lit side using precise geometry paths to prevent transparent shadow overlaps
  ctx.save();
  ctx.beginPath();
  
  if (norm <= 0.005 || norm >= 0.995) {
    // New Moon: nothing to draw for the lit portion
  } else if (norm >= 0.495 && norm <= 0.505) {
    // Full Moon: draw the complete lit circle
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = lightMoonBg;
    ctx.fill();
  } else {
    const isWaxing = norm < 0.5;
    if (isWaxing) {
      // Outer arc: top to bottom along the right side (clockwise)
      ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);
      
      // Terminator arc: bottom to top
      if (norm < 0.25) {
        // Waxing Crescent: curves right (anticlockwise)
        const r_term = R * (1 - 4 * norm);
        ctx.ellipse(cx, cy, r_term, R, 0, Math.PI / 2, -Math.PI / 2, true);
      } else if (norm === 0.25) {
        // First Quarter: straight line
        ctx.lineTo(cx, cy - R);
      } else {
        // Waxing Gibbous: curves left (clockwise)
        const r_term = R * (4 * norm - 1);
        ctx.ellipse(cx, cy, r_term, R, 0, Math.PI / 2, -Math.PI / 2, false);
      }
    } else {
      const w_norm = norm - 0.5;
      // Outer arc: top to bottom along the left side (counter-clockwise)
      ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, true);
      
      // Terminator arc: bottom to top
      if (w_norm < 0.25) {
        // Waning Gibbous: curves right (anticlockwise)
        const r_term = R * (1 - 4 * w_norm);
        ctx.ellipse(cx, cy, r_term, R, 0, Math.PI / 2, -Math.PI / 2, true);
      } else if (w_norm === 0.25) {
        // Third Quarter: straight line
        ctx.lineTo(cx, cy - R);
      } else {
        // Waning Crescent: curves left (clockwise)
        const r_term = R * (4 * w_norm - 1);
        ctx.ellipse(cx, cy, r_term, R, 0, Math.PI / 2, -Math.PI / 2, false);
      }
    }
    
    ctx.closePath();
    ctx.fillStyle = lightMoonBg;
    ctx.fill();
  }
  ctx.restore();
}

// Render the entire Moon Phase dashboard inside its card
function renderMoonPhaseCard(ctx, W, H, computedStyle, textColor, mutedColor, accentColor) {
  let isLightMode = false;
  if (textColor.startsWith("#")) {
    const hex = textColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    isLightMode = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  } else if (textColor.startsWith("rgb")) {
    const match = textColor.match(/\d+/g);
    if (match) {
      const r = parseInt(match[0], 10) || 0;
      const g = parseInt(match[1], 10) || 0;
      const b = parseInt(match[2], 10) || 0;
      isLightMode = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
    }
  }

  const darkMoonBg = isLightMode ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.08)";
  const darkMoonBorder = isLightMode ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
  const lightMoonBg = isLightMode ? accentColor : "#fffae8";
  
  // 1. Calculate active date & moon phase details for the main moon display
  let targetDate;
  if (hoverHour !== null) {
    const hh = Math.floor(hoverHour);
    const mm = Math.round((hoverHour - hh) * 60);
    targetDate = getLocationDayDate(Math.floor(hh / 24), hh % 24, mm);
  } else if (activeTab === 0) {
    targetDate = new Date();
  } else {
    targetDate = getLocationDayDate(activeTab, 12, 0);
  }
  
  const centerDayIndex = hoverHour === null ? activeTab : Math.floor(hoverHour / 24);
  const days = Array.from({ length: 9 }, (_, slot) => {
    const offset = slot - 4;
    const dayIndex = centerDayIndex + offset;
    const date = offset === 0 ? targetDate : getLocationDayDate(dayIndex, 12, 0);
    const parts = getZonedParts(date);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
      .toLocaleDateString("en", { weekday: "short", timeZone: "UTC" });
    return {
      slot,
      offset,
      dayIndex,
      date,
      label: dayIndex === 0 ? "Today" : weekday,
      phase: getMoonPhase(date)
    };
  });

  const view = {
    ctx,
    W,
    H,
    days,
    textColor,
    mutedColor,
    accentColor,
    darkMoonBg,
    darkMoonBorder,
    lightMoonBg
  };

  renderMoonStrip(view);
}

function renderMoonViewHeading(ctx, W, selected, textColor, mutedColor) {
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColor;
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(selected.phase.name, 16, 18);
  ctx.fillStyle = mutedColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${(selected.phase.illumination * 100).toFixed(0)}% illuminated`, W - 16, 18);
  ctx.restore();
}

function renderMoonStrip(view) {
  const { ctx, W, H, days, textColor, mutedColor, accentColor, darkMoonBg, darkMoonBorder, lightMoonBg } = view;
  const selected = days[4];
  renderMoonViewHeading(ctx, W, selected, textColor, mutedColor);

  const startX = 25;
  const endX = W - 25;
  const width = endX - startX;
  const moonY = 96;

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(startX, moonY);
  ctx.lineTo(endX, moonY);
  ctx.stroke();
  ctx.restore();

  days.forEach(day => {
    const x = startX + (day.slot / 8) * width;
    const selectedDay = day.offset === 0;
    const radius = selectedDay ? 21 : (W < 450 ? 10 : 12);
    if (selectedDay) {
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, moonY, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawMoonGraphic(ctx, x, moonY, radius, day.phase.fraction, darkMoonBg, darkMoonBorder, lightMoonBg);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = selectedDay ? accentColor : mutedColor;
    ctx.font = `${selectedDay ? "bold" : "normal"} 8px sans-serif`;
    ctx.fillText(day.label, x, 137);
    ctx.fillStyle = textColor;
    ctx.font = "8px sans-serif";
    ctx.fillText(`${(day.phase.illumination * 100).toFixed(0)}%`, x, 153);
    ctx.restore();
  });

  ctx.save();
  ctx.fillStyle = mutedColor;
  ctx.font = "9px sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("← previous 4 days", 16, H - 18);
  ctx.textAlign = "right";
  ctx.fillText("next 4 days →", W - 16, H - 18);
  ctx.restore();
}

// Initialize!
initWeatherPage();
