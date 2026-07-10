import { mountSiteShell } from "../site.js";
import SunCalc from "../lib/suncalc.js";

// Default location (Oslo, Norway)
const DEFAULT_LOC = {
  lat: 59.9133,
  lon: 10.7390,
  name: "Oslo, Norge"
};

// Caching parameters
const CACHE_PREFIX = "peheje_weather_";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

let currentLoc = { ...DEFAULT_LOC };
let forecastData = null;
let tideData = null;
let activeTab = 0; // 0 for Today, 1 for Tomorrow, 2-6 for future days
let hoverHour = null; // Currently hovered hour on the canvas (0-23)
let savedRadarSrc = "";

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
const zoomToggleBtn = document.getElementById("zoom-toggle-btn");

const uvCanvas = document.getElementById("uv-canvas");
const tempCanvas = document.getElementById("temp-canvas");
const rainCanvas = document.getElementById("rain-canvas");
const windCanvas = document.getElementById("wind-canvas");
const tideCanvas = document.getElementById("tide-canvas");
const cloudsCanvas = document.getElementById("clouds-canvas");
const moonCanvas = document.getElementById("moon-canvas");

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
  rain: { emoji: "🌧️", desc: "Rain" },
  heavyrain: { emoji: "⛈️", desc: "Heavy Rain" },
  snowshowers: { emoji: "🌨️", desc: "Snow Showers" },
  snow: { emoji: "❄️", desc: "Snow" },
  heavysnow: { emoji: "🌨️", desc: "Heavy Snow" },
  sleet: { emoji: "🌨️", desc: "Sleet" },
  thunder: { emoji: "⚡", desc: "Thunderstorm" },
  fog: { emoji: "🌫️", desc: "Fog" }
};

function getWeatherInfo(symbolCode) {
  if (!symbolCode) return { emoji: "☀️", desc: "Clear Sky" };
  const cleanCode = symbolCode.split("_")[0];
  return WEATHER_SYMBOLS[cleanCode] || { emoji: "⛅", desc: cleanCode.replace(/([A-Z])/g, ' $1') };
}

function getWindDirectionLabel(deg) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return directions[val % 16];
}

// Helper to format local YYYY-MM-DD
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Load location from LocalStorage
function loadStoredLocation() {
  const stored = localStorage.getItem("weather_location");
  if (stored) {
    try {
      currentLoc = JSON.parse(stored);
      return;
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

// Fetch forecast from api.met.no with local caching
async function fetchWeather(lat, lon, forceRefresh = false) {
  const cacheKey = `${CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached && !forceRefresh) {
    try {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (age < CACHE_EXPIRY_MS) {
        parsed.data.lastUpdated = parsed.timestamp;
        return parsed.data;
      }
    } catch (err) {
      console.warn("Cached forecast parsing error:", err);
    }
  }

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  // Fetch from MET Norway LocationforecastComplete
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const response = await fetch(url);
  
  if (!window.location) {
    throw new Error("Window unloaded");
  }

  if (!response.ok) {
    throw new Error(`MET Norway API returned status ${response.status}`);
  }

  const data = await response.json();

  // Merge timeseries from old cache if available to preserve history of today's past hours
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const oldTimeseries = parsed.data?.properties?.timeseries || [];
      const newTimeseries = data.properties?.timeseries || [];

      const timeMap = new Map();
      oldTimeseries.forEach(item => {
        timeMap.set(item.time, item);
      });
      newTimeseries.forEach(item => {
        timeMap.set(item.time, item);
      });

      const mergedList = Array.from(timeMap.values()).sort((a, b) => new Date(a.time) - new Date(b.time));

      // Keep only entries from the last 30 hours to prevent cache bloat
      const minTime = Date.now() - 30 * 60 * 60 * 1000;
      data.properties.timeseries = mergedList.filter(item => new Date(item.time).getTime() >= minTime);
    } catch (err) {
      console.warn("Error merging cached forecast timeseries:", err);
    }
  }

  // Save to cache
  const cacheData = {
    timestamp: Date.now(),
    data: data
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));

  data.lastUpdated = cacheData.timestamp;
  return data;
}

// Fetch tide data from Open-Meteo Marine API with local caching
async function fetchTideData(lat, lon) {
  const cacheKey = `${CACHE_PREFIX}tide_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (age < CACHE_EXPIRY_MS) {
        return parsed.data;
      }
    } catch (err) {
      console.warn("Cached tide parsing error:", err);
    }
  }

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=sea_level_height_msl`;
  const response = await fetch(url);

  if (!window.location) {
    throw new Error("Window unloaded");
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo Marine API returned status ${response.status}`);
  }

  const data = await response.json();
  const cacheData = {
    timestamp: Date.now(),
    data: data
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  return data;
}

// Get the weather timeseries data grouped for Today, Tomorrow, or future days
function getDailyTimeseries(timeseries, dayIndex) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayIndex);
  const targetStr = getLocalDateString(targetDate);

  // Initialize a 24-hour bucket
  const hoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    uv: 0,
    temp: null,
    symbol: null,
    rain: 0,
    rainMax: 0,
    rainMin: 0,
    rainProb: null,
    clouds: 0,
    cloudsLow: 0,
    cloudsMid: 0,
    cloudsHigh: 0,
    windSpeed: 0,
    windDir: 0
  }));

  let hasData = false;

  timeseries.forEach(item => {
    const itemDate = new Date(item.time);
    const dateStr = getLocalDateString(itemDate);
    if (dateStr === targetStr) {
      const hr = itemDate.getHours();
      const details = item.data.instant.details;
      hoursData[hr].uv = details.ultraviolet_index_clear_sky || 0;
      hoursData[hr].temp = details.air_temperature;
      hoursData[hr].symbol = item.data.next_1_hours?.summary?.symbol_code || item.data.next_6_hours?.summary?.symbol_code || null;
      
      const rainDetails = item.data.next_1_hours?.details || item.data.next_6_hours?.details;
      hoursData[hr].rain = rainDetails?.precipitation_amount || 0;
      hoursData[hr].rainMax = rainDetails?.precipitation_amount_max || rainDetails?.precipitation_amount || 0;
      hoursData[hr].rainMin = rainDetails?.precipitation_amount_min || rainDetails?.precipitation_amount || 0;
      hoursData[hr].rainProb = rainDetails?.probability_of_precipitation !== undefined ? rainDetails.probability_of_precipitation : null;

      hoursData[hr].clouds = details.cloud_area_fraction !== undefined ? details.cloud_area_fraction : 0;
      hoursData[hr].cloudsLow = details.cloud_area_fraction_low !== undefined ? details.cloud_area_fraction_low : 0;
      hoursData[hr].cloudsMid = details.cloud_area_fraction_medium !== undefined ? details.cloud_area_fraction_medium : 0;
      hoursData[hr].cloudsHigh = details.cloud_area_fraction_high !== undefined ? details.cloud_area_fraction_high : 0;

      hoursData[hr].windSpeed = details.wind_speed || 0;
      hoursData[hr].windDir = details.wind_from_direction || 0;
      hasData = true;
    }
  });

  // If requesting Today (dayIndex === 0), fill in past hours with Tomorrow's values to make curves complete
  if (dayIndex === 0) {
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrowDate);

    const tomorrowHoursData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      uv: 0,
      temp: null,
      symbol: null,
      rain: 0,
      rainMax: 0,
      rainMin: 0,
      rainProb: null,
      clouds: 0,
      cloudsLow: 0,
      cloudsMid: 0,
      cloudsHigh: 0,
      windSpeed: 0,
      windDir: 0
    }));

    timeseries.forEach(item => {
      const itemDate = new Date(item.time);
      if (getLocalDateString(itemDate) === tomorrowStr) {
        const hr = itemDate.getHours();
        const details = item.data.instant.details;
        tomorrowHoursData[hr].uv = details.ultraviolet_index_clear_sky || 0;
        tomorrowHoursData[hr].temp = details.air_temperature;
        tomorrowHoursData[hr].symbol = item.data.next_1_hours?.summary?.symbol_code || item.data.next_6_hours?.summary?.symbol_code || null;
        
        const rainDetails = item.data.next_1_hours?.details || item.data.next_6_hours?.details;
        tomorrowHoursData[hr].rain = rainDetails?.precipitation_amount || 0;
        tomorrowHoursData[hr].rainMax = rainDetails?.precipitation_amount_max || rainDetails?.precipitation_amount || 0;
        tomorrowHoursData[hr].rainMin = rainDetails?.precipitation_amount_min || rainDetails?.precipitation_amount || 0;
        tomorrowHoursData[hr].rainProb = rainDetails?.probability_of_precipitation !== undefined ? rainDetails.probability_of_precipitation : null;

        tomorrowHoursData[hr].clouds = details.cloud_area_fraction !== undefined ? details.cloud_area_fraction : 0;
        tomorrowHoursData[hr].cloudsLow = details.cloud_area_fraction_low !== undefined ? details.cloud_area_fraction_low : 0;
        tomorrowHoursData[hr].cloudsMid = details.cloud_area_fraction_medium !== undefined ? details.cloud_area_fraction_medium : 0;
        tomorrowHoursData[hr].cloudsHigh = details.cloud_area_fraction_high !== undefined ? details.cloud_area_fraction_high : 0;

        tomorrowHoursData[hr].windSpeed = details.wind_speed || 0;
        tomorrowHoursData[hr].windDir = details.wind_from_direction || 0;
      }
    });

    // Copy tomorrow's values for any hour that doesn't have forecast data today
    hoursData.forEach(h => {
      if (h.temp === null) {
        h.uv = tomorrowHoursData[h.hour].uv;
        h.temp = tomorrowHoursData[h.hour].temp;
        h.symbol = tomorrowHoursData[h.hour].symbol;
        h.rain = tomorrowHoursData[h.hour].rain;
        h.rainMax = tomorrowHoursData[h.hour].rainMax;
        h.rainMin = tomorrowHoursData[h.hour].rainMin;
        h.rainProb = tomorrowHoursData[h.hour].rainProb;
        h.clouds = tomorrowHoursData[h.hour].clouds;
        h.cloudsLow = tomorrowHoursData[h.hour].cloudsLow;
        h.cloudsMid = tomorrowHoursData[h.hour].cloudsMid;
        h.cloudsHigh = tomorrowHoursData[h.hour].cloudsHigh;
        h.windSpeed = tomorrowHoursData[h.hour].windSpeed;
        h.windDir = tomorrowHoursData[h.hour].windDir;
      } else if (h.uv === 0 && tomorrowHoursData[h.hour].uv > 0) {
        // Fallback for UV index: clear-sky UV is purely astronomical,
        // so Today's UV at this hour must match Tomorrow's if Today's cached value is missing or 0.
        h.uv = tomorrowHoursData[h.hour].uv;
      }
    });
  }

  return { data: hoursData, found: hasData };
}

// Extract tide points for the target forecast day
function getDailyTideSeries(tideData, dayIndex) {
  if (!tideData || !tideData.hourly) {
    return { data: null, found: false };
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayIndex);
  const targetStr = getLocalDateString(targetDate);

  const hoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: null
  }));

  let hasData = false;
  const times = tideData.hourly.time;
  const values = tideData.hourly.sea_level_height_msl;

  for (let i = 0; i < times.length; i++) {
    // Append 'Z' to parse Open-Meteo GMT time as UTC, converting to browser local time
    const itemDate = new Date(times[i] + 'Z');
    const dateStr = getLocalDateString(itemDate);
    if (dateStr === targetStr) {
      const hr = itemDate.getHours();
      const val = values[i];
      if (val !== null && val !== undefined) {
        hoursData[hr].value = val * 100; // convert meters to centimeters
        hasData = true;
      }
    }
  }

  return { data: hoursData, found: hasData };
}

// Helper to get formatted day name and date
function getDayNameAndDate(i) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dayName = (i === 0) ? "Today" : ((i === 1) ? "Tomorrow" : daysOfWeek[d.getDay()]);
  const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
  return `${dayName} ${dateStr}`;
}

// Helper to update all prev-day and next-day buttons enabled state
function updateHeaderArrows() {
  const prevBtns = document.querySelectorAll(".prev-day");
  const nextBtns = document.querySelectorAll(".next-day");
  
  prevBtns.forEach(btn => {
    btn.disabled = (activeTab === 0);
  });
  nextBtns.forEach(btn => {
    btn.disabled = (activeTab === 6);
  });
}

// Helper to update all graph header date labels
function updateHeaderDates() {
  const dateSpan = getDayNameAndDate(activeTab);
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
  if (newIndex < 0 || newIndex > 6) return;
  if (activeTab !== newIndex) {
    const direction = newIndex > activeTab ? "next" : "prev";
    activeTab = newIndex;
    
    // Update the tabs active class and scroll it into view
    if (dayTabsContainer) {
      const buttons = dayTabsContainer.querySelectorAll(".curve-tab");
      buttons.forEach((btn, idx) => {
        const isActive = idx === activeTab;
        btn.classList.toggle("active", isActive);
        if (isActive) {
          const containerWidth = dayTabsContainer.clientWidth;
          const btnLeft = btn.offsetLeft;
          const btnWidth = btn.clientWidth;
          dayTabsContainer.scrollTo({
            left: btnLeft - (containerWidth / 2) + (btnWidth / 2),
            behavior: "smooth"
          });
        }
      });
    }

    // Sync header navigation arrows
    updateHeaderArrows();

    // Sync header navigation dates
    updateHeaderDates();

    // Trigger visual transitions
    triggerGraphAnimation(direction);

    hoverHour = null;
    drawForecastCurves();
  }
}

// Render dynamic day selection tabs for next 7 days
function renderDayTabs() {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Populate tab buttons
  if (dayTabsContainer) {
    let tabsHtml = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const dayName = (i === 0) ? "Today" : ((i === 1) ? "Tomorrow" : daysOfWeek[d.getDay()]);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const text = `${dayName} ${dateStr}`;

      const activeClass = (i === activeTab) ? " active" : "";
      tabsHtml += `<button type="button" class="curve-tab${activeClass}" data-index="${i}">${text}</button>`;
    }
    dayTabsContainer.innerHTML = tabsHtml;

    const buttons = dayTabsContainer.querySelectorAll(".curve-tab");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-index"), 10);
        changeDay(i);
      });
    });
  }
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
      const uv = details.ultraviolet_index_clear_sky || 0;
      if (uv > maxUV) maxUV = uv;

      const temp = details.air_temperature;
      if (temp !== undefined && temp !== null) {
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
      }

      const wind = details.wind_speed || 0;
      if (wind > maxWind) maxWind = wind;
    }

    const rainDetails = item.data.next_1_hours?.details || item.data.next_6_hours?.details;
    const rain = rainDetails?.precipitation_amount_max || rainDetails?.precipitation_amount || 0;
    if (rain > maxRain) maxRain = rain;
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

// Update widgets UI with the current hourly forecast
function updateDashboardUI(data) {
  const timeseries = data.properties.timeseries;
  
  // Calculate global limits across all days
  calculateGlobalLimits(timeseries);
  
  // Find current hour forecast
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = getLocalDateString(now);

  let currentForecast = null;

  for (const item of timeseries) {
    const itemDate = new Date(item.time);
    if (getLocalDateString(itemDate) === todayStr && itemDate.getHours() === currentHour) {
      currentForecast = item;
      break;
    }
  }

  if (!currentForecast && timeseries.length > 0) {
    currentForecast = timeseries[0];
  }

  if (currentForecast) {
    const details = currentForecast.data.instant.details;
    let uvVal = details.ultraviolet_index_clear_sky || 0;
    
    // Interpolate UV index based on current minute to show exact minute-by-minute value
    const nextHour = (currentHour + 1) % 24;
    let nextForecast = null;
    for (const item of timeseries) {
      const itemDate = new Date(item.time);
      if (getLocalDateString(itemDate) === todayStr && itemDate.getHours() === nextHour) {
        nextForecast = item;
        break;
      }
    }
    if (nextForecast) {
      const nextUv = nextForecast.data.instant.details.ultraviolet_index_clear_sky || 0;
      const t = now.getMinutes() / 60 + now.getSeconds() / 3600;
      uvVal = uvVal + t * (nextUv - uvVal);
    }

    const tempVal = details.air_temperature;
    
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
    const precipValue = document.getElementById("precip-value");

    const symbolCode = currentForecast.data.next_1_hours?.summary?.symbol_code || null;
    const weather = getWeatherInfo(symbolCode);
    weatherEmoji.textContent = weather.emoji;
    tempValue.textContent = `${tempVal.toFixed(1)}\u00B0C`;
    weatherDesc.textContent = weather.desc;

    windValue.textContent = details.wind_speed ? `${details.wind_speed.toFixed(1)} m/s` : "-- m/s";
    
    const precip = currentForecast.data.next_1_hours?.details?.precipitation_amount || 0;
    precipValue.textContent = `${precip.toFixed(1)} mm`;
  }

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

  // Calculate Sunrise and Sunset for Today
  try {
    const today = new Date();
    const sunTimes = SunCalc.getTimes(today, currentLoc.lat, currentLoc.lon);
    if (sunTimes && sunTimes.sunrise && !isNaN(sunTimes.sunrise.getTime())) {
      const sunriseStr = `${String(sunTimes.sunrise.getHours()).padStart(2, '0')}:${String(sunTimes.sunrise.getMinutes()).padStart(2, '0')}`;
      document.getElementById("uv-sunrise").textContent = sunriseStr;
    } else {
      document.getElementById("uv-sunrise").textContent = "--:--";
    }
    if (sunTimes && sunTimes.sunset && !isNaN(sunTimes.sunset.getTime())) {
      const sunsetStr = `${String(sunTimes.sunset.getHours()).padStart(2, '0')}:${String(sunTimes.sunset.getMinutes()).padStart(2, '0')}`;
      document.getElementById("uv-sunset").textContent = sunsetStr;
    } else {
      document.getElementById("uv-sunset").textContent = "--:--";
    }
  } catch (err) {
    console.error("Failed to calculate sunrise/sunset:", err);
    document.getElementById("uv-sunrise").textContent = "--:--";
    document.getElementById("uv-sunset").textContent = "--:--";
  }

  // Draw forecast day selection tabs
  renderDayTabs();

  // Draw forecast canvases
  drawForecastCurves();

  // Sync header navigation arrows
  updateHeaderArrows();

  // Sync header navigation dates
  updateHeaderDates();

  // Update last-updated timestamp
  if (data.lastUpdated) {
    const lastUpdatedEl = document.getElementById("last-updated");
    if (lastUpdatedEl) {
      const date = new Date(data.lastUpdated);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      lastUpdatedEl.textContent = `Updated: ${hours}:${minutes}`;
    }
  }
}

// Draw all forecast curves simultaneously
function drawForecastCurves() {
  if (!forecastData) return;

  const timeseries = forecastData.properties.timeseries;
  const { data: dayPoints, found } = getDailyTimeseries(timeseries, activeTab);
  if (!found) return;

  drawSingleCurve(uvCanvas, "uv", dayPoints);
  drawSingleCurve(tempCanvas, "temp", dayPoints);
  drawSingleCurve(rainCanvas, "rain", dayPoints);
  drawSingleCurve(windCanvas, "wind", dayPoints);

  const { data: tidePoints, found: tideFound } = getDailyTideSeries(tideData, activeTab);
  drawSingleCurve(tideCanvas, "tide", tidePoints, tideFound);
  drawSingleCurve(cloudsCanvas, "clouds", dayPoints);
  drawSingleCurve(moonCanvas, "moon", dayPoints);
}

// Canvas rendering helper for a single curve parameters
function drawSingleCurve(canvas, paramType, dayPoints, dataFound = true) {
  if (!canvas) return;

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

  ctx.clearRect(0, 0, W, H);

  if (paramType === "moon") {
    renderMoonPhaseCard(ctx, W, H, computedStyle, textColor, mutedColor, accentColor, dayPoints);
    return;
  }

  if (!dataFound || !dayPoints) {
    ctx.save();
    ctx.fillStyle = mutedColor;
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("Tide data is only available for coastal locations", W / 2, H / 2 - 10);
    ctx.fillText(`No tide data for ${currentLoc.name}`, W / 2, H / 2 + 10);
    ctx.restore();
    return;
  }

  // Margins
  const paddingL = 38;
  const paddingR = 15;
  const paddingT = 25;
  const paddingB = 30;

  const graphW = W - paddingL - paddingR;
  const graphH = H - paddingT - paddingB;

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
    const maxVal = globalLimits ? globalLimits.rainMax : Math.max(...dayPoints.map(p => p.rain), 0);
    let step = 0.5;
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
    const maxVal = (globalLimits && globalLimits.windMax !== undefined) ? globalLimits.windMax : Math.max(...dayPoints.map(p => p.windSpeed), 0);
    minScaleY = 0;
    let step = 2;
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
    ctx.fillText(val, paddingL - 8, y);
  });
  ctx.restore();

  // 2. Draw vertical time lines and labels
  ctx.save();
  ctx.fillStyle = mutedColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  
  let hoursToShow = [];
  if (zoomIndex === 0) {
    hoursToShow = [0, 4, 8, 12, 16, 20, 23];
  } else { // 1
    const s = Math.ceil(viewStartHour);
    const e = Math.floor(viewEndHour);
    for (let hr = s; hr <= e; hr++) {
      if (hr % 2 === 0) {
        hoursToShow.push(hr);
      }
    }
  }

  hoursToShow.forEach(hr => {
    const x = getX(hr);
    ctx.fillText(`${String(hr).padStart(2, '0')}:00`, x, H - paddingB + 8);
  });
  ctx.restore();

  // Build coordinate points, filtering out entries that do not have forecast data (like past hours, or missing intermediate hours on later days)
  const points = dayPoints.filter(p => (paramType === "tide" ? p.value !== null : p.temp !== null)).map(p => {
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
      temp: p.temp,
      rain: p.rain,
      rainMax: p.rainMax,
      rainMin: p.rainMin,
      rainProb: p.rainProb,
      clouds: p.clouds,
      cloudsLow: p.cloudsLow,
      cloudsMid: p.cloudsMid,
      cloudsHigh: p.cloudsHigh,
      windSpeed: p.windSpeed,
      windDir: p.windDir,
      hour: p.hour,
      symbol: p.symbol,
      tideValue: p.value
    };
  });

  if (points.length === 0) return;

  // Clip content area horizontally (between paddingL and W - paddingR)
  ctx.save();
  ctx.beginPath();
  ctx.rect(paddingL, 0, graphW, H);
  ctx.clip();

  if (paramType === "rain") {
    // ---- Draw Precipitation Bar Chart ----
    ctx.save();
    const barW = Math.max(3, Math.floor((graphW / 24) * 0.65));
    
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
      if (barH > 0.5) {
        ctx.fillRect(p.x - barW / 2, y1, barW, barH);
        ctx.strokeRect(p.x - barW / 2, y1, barW, barH);
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
        ctx.moveTo(p.x, yMin);
        ctx.lineTo(p.x, yMax);
        ctx.stroke();

        // Top horizontal cap
        ctx.beginPath();
        ctx.moveTo(p.x - 3, yMax);
        ctx.lineTo(p.x + 3, yMax);
        ctx.stroke();

        // Bottom horizontal cap (only if not at baseline)
        if (yMin < y0 - 1) {
          ctx.beginPath();
          ctx.moveTo(p.x - 3, yMin);
          ctx.lineTo(p.x + 3, yMin);
          ctx.stroke();
        }
        ctx.restore();
      }
    });
    ctx.restore();
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

    ctx.beginPath();
    ctx.moveTo(points[0].x, H - paddingB);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const xc = (p0.x + p1.x) / 2;
      const yc = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, H - paddingB);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

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

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const xc = (p0.x + p1.x) / 2;
      const yc = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.restore();

    // Draw sunrise and sunset lines on the UV curve
    if (paramType === "uv") {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + activeTab);
        const sunTimes = SunCalc.getTimes(targetDate, currentLoc.lat, currentLoc.lon);
        const sunrise = sunTimes.sunrise;
        const sunset = sunTimes.sunset;

        if (sunrise && !isNaN(sunrise.getTime())) {
          const sunriseHour = sunrise.getHours() + sunrise.getMinutes() / 60 + sunrise.getSeconds() / 3600;
          const xSunrise = getX(sunriseHour);
          if (xSunrise >= paddingL && xSunrise <= W - paddingR) {
            ctx.save();
            ctx.strokeStyle = "rgba(234, 179, 8, 0.45)"; // Amber/yellow dashed line
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xSunrise, paddingT + 32);
            ctx.lineTo(xSunrise, H - paddingB);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = textColor;
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const timeStr = `${String(sunrise.getHours()).padStart(2, '0')}:${String(sunrise.getMinutes()).padStart(2, '0')}`;
            ctx.fillText("Sunrise", xSunrise, paddingT + 5);
            ctx.fillText(timeStr, xSunrise, paddingT + 17);
            ctx.restore();
          }
        }

        if (sunset && !isNaN(sunset.getTime())) {
          const sunsetHour = sunset.getHours() + sunset.getMinutes() / 60 + sunset.getSeconds() / 3600;
          const xSunset = getX(sunsetHour);
          if (xSunset >= paddingL && xSunset <= W - paddingR) {
            ctx.save();
            ctx.strokeStyle = "rgba(168, 85, 247, 0.45)"; // Purple/dusk dashed line
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xSunset, paddingT + 32);
            ctx.lineTo(xSunset, H - paddingB);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = textColor;
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const timeStr = `${String(sunset.getHours()).padStart(2, '0')}:${String(sunset.getMinutes()).padStart(2, '0')}`;
            ctx.fillText("Sunset", xSunset, paddingT + 5);
            ctx.fillText(timeStr, xSunset, paddingT + 17);
            ctx.restore();
          }
        }
      } catch (err) {
        console.error("Error drawing sunrise/sunset lines:", err);
      }
    }

    // 4b. Draw wind direction arrows at 3-hour intervals
    if (paramType === "wind") {
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      
      points.forEach(p => {
        if (p.hour % 3 === 0) {
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

  // 5. Current hour vertical line indicator (shows the current minute via linear interpolation)
  const now = new Date();
  if (activeTab === 0) {
    const currentTimeDec = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const h0 = Math.floor(currentTimeDec);
    const h1 = Math.min(23, h0 + 1);
    
    const p0 = points.find(p => p.hour === h0);
    const p1 = points.find(p => p.hour === h1) || p0;
    
    if (p0) {
      const t = currentTimeDec - h0;
      const curX = p0.x + t * (p1.x - p0.x);
      const curY = p0.y + t * (p1.y - p0.y);

      ctx.save();
      ctx.strokeStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.7)" : accentColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curX, paddingT);
      ctx.lineTo(curX, H - paddingB);
      ctx.stroke();
      ctx.restore();

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
    }
  }

  ctx.restore(); // End horizontal clipping!

  // 6. Draw hover tooltip / inspector cursor (interpolated continuously for the hovered minute)
  if (hoverHour !== null && hoverHour >= 0 && hoverHour <= 23) {
    const h0 = Math.floor(hoverHour);
    const h1 = Math.min(23, h0 + 1);
    
    const p0 = points.find(p => p.hour === h0);
    const p1 = points.find(p => p.hour === h1) || p0;
    
    if (p0) {
      const t = hoverHour - h0;
      
      const hpX = p0.x + t * (p1.x - p0.x);
      const hpY = p0.y + t * (p1.y - p0.y);
      const hpVal = p0.val + t * (p1.val - p0.val);
      const hpUv = p0.uv + t * (p1.uv - p0.uv);
      const hpTemp = p0.temp !== null && p1.temp !== null ? p0.temp + t * (p1.temp - p0.temp) : p0.temp;
      const hpRain = p0.rain !== null && p1.rain !== null ? p0.rain + t * (p1.rain - p0.rain) : p0.rain;
      const hpWindSpeed = p0.windSpeed + t * (p1.windSpeed - p0.windSpeed);
      const hpTideValue = p0.tideValue !== null && p1.tideValue !== null ? p0.tideValue + t * (p1.tideValue - p0.tideValue) : p0.tideValue;
      const hpClouds = p0.clouds + t * (p1.clouds - p0.clouds);
      const hpCloudsLow = p0.cloudsLow + t * (p1.cloudsLow - p0.cloudsLow);
      const hpCloudsMid = p0.cloudsMid + t * (p1.cloudsMid - p0.cloudsMid);
      const hpCloudsHigh = p0.cloudsHigh + t * (p1.cloudsHigh - p0.cloudsHigh);
      
      const hpRainProb = p0.rainProb !== null && p1.rainProb !== null ? Math.round(p0.rainProb + t * (p1.rainProb - p0.rainProb)) : p0.rainProb;
      const hpRainMax = p0.rainMax !== null && p1.rainMax !== null ? p0.rainMax + t * (p1.rainMax - p0.rainMax) : p0.rainMax;

      const hp = {
        x: hpX,
        y: hpY,
        val: hpVal,
        uv: hpUv,
        temp: hpTemp,
        rain: hpRain,
        windSpeed: hpWindSpeed,
        windDir: p0.windDir,
        tideValue: hpTideValue,
        clouds: hpClouds,
        cloudsLow: hpCloudsLow,
        cloudsMid: hpCloudsMid,
        cloudsHigh: hpCloudsHigh,
        hour: hoverHour,
        symbol: p0.symbol,
        rainProb: hpRainProb,
        rainMax: hpRainMax
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
      ctx.restore();

      // Parameter-specific tooltip box
      ctx.save();
      const tooltipLines = [];
      let boxColor = accentColor;

      const totalMinutes = Math.round(hp.hour * 60);
      const hh = Math.floor(totalMinutes / 60);
      const mm = totalMinutes % 60;
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      
      if (paramType === "uv") {
        const uvLevel = getUVLevel(hp.uv);
        boxColor = uvLevel.color;
        tooltipLines.push(`Time: ${timeStr}`);
        tooltipLines.push(`UV Index: ${hp.uv.toFixed(1)}`);
        tooltipLines.push(`Level: ${uvLevel.label}`);
      } else if (paramType === "temp") {
        const emojiInfo = getWeatherInfo(hp.symbol);
        boxColor = "#ff6b8b";
        tooltipLines.push(`Time: ${timeStr}`);
        tooltipLines.push(`Temp: ${hp.temp !== null ? hp.temp.toFixed(1) : "--"}\u00B0C`);
        tooltipLines.push(`Weather: ${emojiInfo.emoji}`);
      } else if (paramType === "rain") {
        boxColor = "#38d4ff";
        tooltipLines.push(`Time: ${timeStr}`);
        tooltipLines.push(`Rain: ${hp.rain !== null ? hp.rain.toFixed(1) : "0.0"} mm`);
        if (hp.rainProb !== null && hp.rainProb !== undefined) {
          tooltipLines.push(`Chance: ${hp.rainProb}%`);
        }
        if (hp.rainMax !== null && hp.rainMax > hp.rain) {
          tooltipLines.push(`Max likely: ${hp.rainMax.toFixed(1)} mm`);
        }
      } else if (paramType === "wind") {
        boxColor = "#00f5d4";
        tooltipLines.push(`Time: ${timeStr}`);
        tooltipLines.push(`Wind: ${hp.windSpeed.toFixed(1)} m/s`);
        tooltipLines.push(`Direction: ${getWindDirectionLabel(hp.windDir)} (${hp.windDir}\u00B0)`);
      } else if (paramType === "tide") {
        boxColor = "#00b4d8";
        tooltipLines.push(`Time: ${timeStr}`);
        tooltipLines.push(`Tide Level: ${hp.tideValue !== null ? hp.tideValue.toFixed(1) : "--"} cm`);
      } else if (paramType === "clouds") {
        boxColor = "#38b2ff";
        tooltipLines.push(`Time: ${timeStr}`);
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

  // 7. Draw zoom level indicator (drawn when zoomIndex === 1)
  if (zoomIndex === 1) {
    ctx.save();
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("🔍 Zoom: Focus View", W - paddingR - 4, paddingT - 18);
    ctx.restore();
  }
}

let zoomIndex = 0; // 0 = Full Day, 1 = Focus View
let startTouchDist = null;

function getZoomWindow() {
  const now = new Date();
  const currentHour = now.getHours();

  if (zoomIndex === 0) {
    return { start: 0, end: 23 };
  } else { // 1 (Focus View: currentHour - 2 to currentHour + 8)
    let start = currentHour - 2;
    let end = currentHour + 8;
    if (start < 0) {
      end -= start;
      start = 0;
    }
    if (end > 23) {
      start -= (end - 23);
      end = 23;
    }
    start = Math.max(0, start);
    end = Math.min(23, end);
    return { start, end };
  }
}

function updateZoomUI() {
  const btn = document.getElementById("zoom-toggle-btn");
  if (btn) {
    if (zoomIndex === 0) btn.textContent = "🔍 Zoom: Full Day";
    else btn.textContent = "🔍 Zoom: Focus View";
  }
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
    
    if (ratio > 1.25) { // Pinch out -> Zoom in
      if (zoomIndex === 0) {
        zoomIndex = 1;
        startTouchDist = dist;
        updateZoomUI();
      }
    } else if (ratio < 0.8) { // Pinch in -> Zoom out
      if (zoomIndex === 1) {
        zoomIndex = 0;
        startTouchDist = dist;
        updateZoomUI();
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
  
  if (e.deltaY < 0) { // Scroll up -> Zoom in
    if (zoomIndex === 0) {
      zoomIndex = 1;
      updateZoomUI();
    }
  } else if (e.deltaY > 0) { // Scroll down -> Zoom out
    if (zoomIndex === 1) {
      zoomIndex = 0;
      updateZoomUI();
    }
  }
  
  handleCanvasHover(e);
}

// Track hover coordinates on canvas
function handleCanvasHover(e) {
  if (!forecastData) return;

  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const x = clientX - rect.left;

  const paddingL = 38;
  const paddingR = 15;
  const graphW = rect.width - paddingL - paddingR;

  const { start: viewStartHour, end: viewEndHour } = getZoomWindow();
  const relativeX = x - paddingL;
  const range = viewEndHour - viewStartHour;
  let hr = viewStartHour + (relativeX / graphW) * range;
  if (zoomIndex === 0) {
    hr = Math.round(hr);
  }
  hr = Math.max(0, Math.min(23, hr));

  if (hoverHour !== hr) {
    hoverHour = hr;
    drawForecastCurves();
  }
}

function handleCanvasLeave() {
  if (hoverHour !== null) {
    hoverHour = null;
    drawForecastCurves();
  }
}

// Fetch forecast and refresh page
async function loadWeatherData(lat, lon, name, silent = false, isGps = false, forceRefresh = false) {
  showError("");
  if (!silent) {
    setLoaderState(true);
  }
  try {
    forecastData = await fetchWeather(lat, lon, forceRefresh);
    if (!window.location) return;
    
    currentLoc = { lat, lon, name, isGps };
    saveLocation(currentLoc);

    locationDisplay.textContent = name;
    if (gpsBadge) {
      gpsBadge.style.display = isGps ? "inline-flex" : "none";
    }
    coordinatesDisplay.textContent = `(${lat.toFixed(2)}, ${lon.toFixed(2)})`;

    // Update live weather radar map iframe (bypass in Happy DOM testing to prevent network errors)
    const radarIframe = document.getElementById("radar-iframe");
    const isHappyDOM = window.happyDOM || (navigator && navigator.userAgent && /happy-dom|happydom/i.test(navigator.userAgent));
    if (radarIframe && !isHappyDOM) {
      const srcUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=8&level=surface&overlay=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
      if (document.visibilityState === "hidden") {
        savedRadarSrc = srcUrl;
        radarIframe.src = "";
      } else {
        radarIframe.src = srcUrl;
        savedRadarSrc = "";
      }
    }

    if (!silent) {
      setLoaderState(false);
    }
    updateDashboardUI(forecastData);

    // Fetch tide data independently in the background
    tideData = null;
    if (!isHappyDOM) {
      fetchTideData(lat, lon).then(data => {
        tideData = data;
        const { data: tidePoints, found: tideFound } = getDailyTideSeries(tideData, activeTab);
        drawSingleCurve(tideCanvas, "tide", tidePoints, tideFound);
      }).catch(err => {
        console.warn("Failed to load tide data in background:", err);
        tideData = null;
        drawSingleCurve(tideCanvas, "tide", null, false);
      });
    } else {
      drawSingleCurve(tideCanvas, "tide", null, false);
    }

  } catch (err) {
    if (!window.location || err.message === "Window unloaded") return;
    console.error(err);
    showError(`Error loading weather forecast: ${err.message}. Please check connection.`);
    setLoaderState(false);
  }
}

// Nominatim Geocoding implementation
let debounceTimeout = null;

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  if (query === "/reset") {
    localStorage.clear();
    document.documentElement.className = "";
    document.body.className = "";
    location.reload();
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Search service failed");
    
    const results = await response.json();
    displaySuggestions(results);
  } catch (err) {
    console.error(err);
    showError("Could not retrieve search suggestions. Please try again.");
  }
}

function displaySuggestions(items) {
  suggestionsList.innerHTML = "";
  if (items.length === 0) {
    suggestionsList.style.display = "none";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    
    const parts = item.display_name.split(",");
    const shortName = parts.slice(0, 3).join(",");
    div.textContent = shortName;

    div.addEventListener("click", () => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      searchInput.value = shortName;
      suggestionsList.style.display = "none";
      loadWeatherData(lat, lon, shortName);
    });

    suggestionsList.append(div);
  });

  suggestionsList.style.display = "block";
}

// Geolocation GPS fetcher
function getGPSLocation() {
  if (!navigator.geolocation) {
    showError("GPS geolocation is not supported by your browser.");
    return;
  }

  showError("");
  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      let locName = "GPS Location";
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`);
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
      
      loadWeatherData(lat, lon, locName, false, true);
    },
    err => {
      console.warn("GPS Location error", err);
      let errMsg = "Could not access location.";
      if (err.code === 1) errMsg = "GPS permission denied.";
      else if (err.code === 2) errMsg = "Position unavailable.";
      showError(errMsg + " Using default location.");
      
      loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, false, currentLoc.isGps);
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
          try { navigator.vibrate(50); } catch(err) {}
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
    drawForecastCurves();
    menu.remove();
  });
  menu.appendChild(btnToggle);

  // Source Attribution (Unclickable Button)
  const CARD_SOURCES = {
    temp: "MET Norway",
    precip: "MET Norway",
    clouds: "MET Norway",
    uv: "MET Norway",
    wind: "MET Norway",
    tide: "Open-Meteo",
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

// Initialize Page
function initWeatherPage() {
  // Hidden developer reset command via URL parameter
  if (new URLSearchParams(window.location.search).has("reset")) {
    localStorage.clear();
    document.documentElement.className = "";
    document.body.className = "";
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

  // Load last stored location if any
  loadStoredLocation();

  // Detect if page was reloaded (F5) to bypass cache and force update
  const isReload = !!(
    (window.performance && window.performance.navigation && window.performance.navigation.type === 1) ||
    (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0] && window.performance.getEntriesByType("navigation")[0].type === "reload")
  );

  // Initial data load
  loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, false, currentLoc.isGps, isReload);

  // Setup tab switches
  setupTabs();

  // Setup header chevron click and swipe day navigation
  setupHeaderNavigation();

  // GPS Click handler
  locationBtn.addEventListener("click", getGPSLocation);

  // Search button click handler
  searchBtn.addEventListener("click", performSearch);

  // Zoom toggle button handler
  if (zoomToggleBtn) {
    zoomToggleBtn.addEventListener("click", () => {
      zoomIndex = 1 - zoomIndex;
      updateZoomUI();
    });
  }

  // Search enter handler
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  });

  // Autocomplete auto-triggering on keyup (debounced)
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    const val = searchInput.value.trim();
    if (val.length < 3) {
      suggestionsList.style.display = "none";
      return;
    }
    debounceTimeout = setTimeout(performSearch, 400);
  });

  // Hide suggestions if clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      suggestionsList.style.display = "none";
    }
  });

  // Redraw canvases on window resize using requestAnimationFrame throttling
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout) {
      window.cancelAnimationFrame(resizeTimeout);
    }
    resizeTimeout = window.requestAnimationFrame(() => {
      drawForecastCurves();
      resizeTimeout = null;
    });
  });

  // Bind synced mouse/touch event listeners across all canvases
  [uvCanvas, tempCanvas, rainCanvas, windCanvas, tideCanvas, cloudsCanvas].forEach(canvas => {
    if (!canvas) return;
    canvas.addEventListener("mousemove", handleCanvasHover);
    canvas.addEventListener("mouseleave", handleCanvasLeave);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    
    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  });

  // Redraw canvases if active page theme is toggled
  const themeObserver = new MutationObserver(() => {
    drawForecastCurves();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Periodically check if forecast is stale (every 5 minutes)
  setInterval(() => {
    if (document.visibilityState === "visible" && forecastData && forecastData.lastUpdated) {
      const age = Date.now() - forecastData.lastUpdated;
      if (age >= CACHE_EXPIRY_MS) {
        loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, true, currentLoc.isGps);
      }
    }
  }, 5 * 60 * 1000);

  // Periodically update the time indicators and dashboard values every 60 seconds (smooth interpolation update)
  setInterval(() => {
    if (document.visibilityState === "visible" && forecastData) {
      updateDashboardUI(forecastData);
    }
  }, 60 * 1000);

  // Manage resources and refresh when user returns to the tab
  document.addEventListener("visibilitychange", () => {
    const radarIframe = document.getElementById("radar-iframe");
    const isHappyDOM = window.happyDOM || (navigator && navigator.userAgent && /happy-dom|happydom/i.test(navigator.userAgent));

    if (document.visibilityState === "hidden") {
      // Unload Windy iframe in background to eliminate WebGL/animation battery drain
      if (radarIframe && !isHappyDOM && radarIframe.src) {
        savedRadarSrc = radarIframe.src;
        radarIframe.src = "";
      }
    } else if (document.visibilityState === "visible") {
      // Restore radar animations in foreground
      if (radarIframe && !isHappyDOM && savedRadarSrc) {
        radarIframe.src = savedRadarSrc;
        savedRadarSrc = "";
      }

      if (forecastData && forecastData.lastUpdated) {
        const age = Date.now() - forecastData.lastUpdated;
        // Bypasses the cache and immediately forces a refresh if the user has been away 
        // and returns after 5 minutes or more since the last update.
        if (age >= 5 * 60 * 1000) {
          loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, true, currentLoc.isGps, true);
        }
      }
    }
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
  
  let name = "";
  let emoji = "";
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
  const isWaxing = norm <= 0.5;
  
  // 1. Draw full dark background circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fillStyle = darkMoonBg;
  ctx.strokeStyle = darkMoonBorder;
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  
  // 2. Draw lit side using clipping
  ctx.save();
  ctx.beginPath();
  if (isWaxing) {
    ctx.rect(cx, cy - R, R + 2, R * 2 + 4);
  } else {
    ctx.rect(cx - R - 2, cy - R, R + 2, R * 2 + 4);
  }
  ctx.clip();
  
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fillStyle = lightMoonBg;
  ctx.fill();
  ctx.restore();
  
  // 3. Draw the terminator ellipse
  ctx.save();
  const k = isWaxing ? norm : (1 - norm);
  const W_term = R * Math.abs(1 - 4 * k);
  
  if (W_term > 0.01) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, W_term, R, 0, 0, 2 * Math.PI);
    if (k < 0.25) {
      ctx.fillStyle = darkMoonBg;
    } else {
      ctx.fillStyle = lightMoonBg;
    }
    ctx.fill();
  }
  ctx.restore();
}

// Render the entire Moon Phase dashboard inside its card
function renderMoonPhaseCard(ctx, W, H, computedStyle, textColor, mutedColor, accentColor, dayPoints) {
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
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + activeTab);
  if (hoverHour !== null) {
    const hh = Math.floor(hoverHour);
    const mm = Math.round((hoverHour - hh) * 60);
    targetDate.setHours(hh, mm, 0, 0);
  } else if (activeTab === 0) {
    // Keep current hour
  } else {
    targetDate.setHours(12, 0, 0, 0);
  }
  
  const mainPhase = getMoonPhase(targetDate);
  const isCompact = W < 450;
  
  // Main Moon position & size (centered!)
  const mainMoonRadius = isCompact ? 24 : 28;
  const mainMoonCx = W / 2;
  const mainMoonCy = 36;
  
  drawMoonGraphic(ctx, mainMoonCx, mainMoonCy, mainMoonRadius, mainPhase.fraction, darkMoonBg, darkMoonBorder, lightMoonBg);
  
  // Draw stats centered underneath the main moon
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Title (Phase Name)
  ctx.font = `bold ${isCompact ? "12px" : "13px"} sans-serif`;
  ctx.fillText(mainPhase.name, W / 2, 76);
  
  // Sub-stats (Illumination, Age, Next Full Moon)
  let daysToFull = 0;
  if (mainPhase.fraction <= 0.5) {
    daysToFull = (0.5 - mainPhase.fraction) * 29.53059;
  } else {
    daysToFull = (1.5 - mainPhase.fraction) * 29.53059;
  }
  
  const dateOptions = { month: 'short', day: 'numeric' };
  const dateStr = targetDate.toLocaleDateString([], dateOptions);
  let timeStr = dateStr;
  if (hoverHour !== null) {
    const hh = Math.floor(hoverHour);
    const mm = Math.round((hoverHour - hh) * 60);
    timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  
  ctx.font = `${isCompact ? "9px" : "10px"} sans-serif`;
  ctx.fillStyle = mutedColor;
  const statsLine = `Illumination: ${(mainPhase.illumination * 100).toFixed(0)}%   •   Age: ${mainPhase.age.toFixed(1)}d   •   Full Moon: in ${daysToFull.toFixed(1)}d   •   Time: ${timeStr}`;
  ctx.fillText(statsLine, W / 2, 94);
  
  // Draw horizontal divider line
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 108);
  ctx.lineTo(W * 0.85, 108);
  ctx.strokeStyle = isLightMode ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  
  // 2. Render the sliding 7-day trend timeline centered at the bottom
  const graphStartX = W * 0.12;
  const graphEndX = W - W * 0.12;
  const graphWidth = graphEndX - graphStartX;
  
  // Collect 7 days of sliding data
  const daysData = [];
  for (let s = 0; s < 7; s++) {
    const dayOffset = s - 3;
    const targetDayIndex = activeTab + dayOffset;
    
    const d = new Date();
    d.setDate(d.getDate() + targetDayIndex);
    d.setHours(12, 0, 0, 0);
    
    daysData.push({
      slot: s,
      dayIndex: targetDayIndex,
      phase: getMoonPhase(d),
      x: graphStartX + (s / 6) * graphWidth
    });
  }
  
  // Layout Y geometry (vertical height bounds)
  const topTextY = 126;
  const bottomTextY = H - 18;
  
  const curveMinY = 144;
  const curveMaxY = H - 38;
  const curveH = curveMaxY - curveMinY;
  const getY = (ill) => curveMinY + (1 - ill) * curveH;
  
  // Draw curve connecting the mini moons
  ctx.save();
  ctx.beginPath();
  daysData.forEach((day, idx) => {
    const y = getY(day.phase.illumination);
    if (idx === 0) {
      ctx.moveTo(day.x, y);
    } else {
      ctx.lineTo(day.x, y);
    }
  });
  ctx.strokeStyle = isLightMode ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 3]);
  ctx.stroke();
  ctx.restore();
  
  // Draw small moons, fixed text labels, and vertical dotted connection lines
  daysData.forEach(day => {
    const y = getY(day.phase.illumination);
    const r = isCompact ? 10 : 12; // Beautifully sized mini-moons
    const isActive = day.slot === 3;
    
    // Vertical dotted alignment line
    ctx.save();
    ctx.strokeStyle = isLightMode ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 2]);
    ctx.beginPath();
    ctx.moveTo(day.x, topTextY + 6);
    ctx.lineTo(day.x, bottomTextY - 6);
    ctx.stroke();
    ctx.restore();
    
    if (isActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(day.x, y, r + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw the mini moon
    drawMoonGraphic(ctx, day.x, y, r, day.phase.fraction, darkMoonBg, darkMoonBorder, lightMoonBg);
    
    // Weekday label
    ctx.save();
    let dayName = "";
    if (day.dayIndex === 0) {
      dayName = "Today";
      ctx.fillStyle = textColor;
      ctx.font = `bold ${isCompact ? "8px" : "9px"} sans-serif`;
    } else {
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const d = new Date();
      d.setDate(d.getDate() + day.dayIndex);
      dayName = weekdays[d.getDay()];
      
      ctx.fillStyle = isActive ? accentColor : mutedColor;
      ctx.font = `${isActive ? "bold" : "normal"} ${isCompact ? "8px" : "9px"} sans-serif`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(dayName, day.x, topTextY);
    ctx.restore();
    
    // Illumination percentage
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `${isCompact ? "8px" : "9px"} sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${(day.phase.illumination * 100).toFixed(0)}%`, day.x, bottomTextY);
    ctx.restore();
  });
}

// Initialize!
initWeatherPage();
