import { mountSiteShell } from "../site.js";

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

let globalLimits = {
  uvMax: 10,
  tempMin: 0,
  tempMax: 10,
  rainMax: 2.0
};

// DOM Elements
const searchInput = document.getElementById("city-search");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const suggestionsList = document.getElementById("suggestions-list");
const locationDisplay = document.getElementById("location-display");
const coordinatesDisplay = document.getElementById("coordinates-display");
const errorBar = document.getElementById("error-bar");
const dashboardContent = document.getElementById("dashboard-content");
const loadingSpinner = document.getElementById("loading-spinner");

const dayTabsContainer = document.getElementById("day-tabs");

const uvCanvas = document.getElementById("uv-canvas");
const tempCanvas = document.getElementById("temp-canvas");
const rainCanvas = document.getElementById("rain-canvas");
const windCanvas = document.getElementById("wind-canvas");
const tideCanvas = document.getElementById("tide-canvas");

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
async function fetchWeather(lat, lon) {
  const cacheKey = `${CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
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

  // Fetch from MET Norway LocationforecastComplete
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const response = await fetch(url);
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

  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=sea_level_height_msl`;
  const response = await fetch(url);
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
        h.windSpeed = tomorrowHoursData[h.hour].windSpeed;
        h.windDir = tomorrowHoursData[h.hour].windDir;
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
    
    // Update the tabs active class
    if (dayTabsContainer) {
      const buttons = dayTabsContainer.querySelectorAll(".curve-tab");
      buttons.forEach((btn, idx) => {
        btn.classList.toggle("active", idx === activeTab);
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
    const uvVal = details.ultraviolet_index_clear_sky || 0;
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
    maxScaleY = Math.max(2.0, Math.ceil(maxVal + 0.5));
    const step = maxScaleY / 4;
    for (let i = 0; i <= 4; i++) {
      gridLevels.push(Math.round((i * step) * 10) / 10);
    }
  } else if (paramType === "wind") {
    const maxVal = globalLimits ? globalLimits.windMax : Math.max(...dayPoints.map(p => p.windSpeed), 0);
    minScaleY = 0;
    maxScaleY = Math.max(5, Math.ceil(maxVal / 5) * 5);
    const range = maxScaleY - minScaleY;
    const step = range > 15 ? 5 : 2.5;
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
  }

  // Coordinate converter helpers
  const getX = (hour) => paddingL + (hour / 23) * graphW;
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
  
  const hoursToShow = [0, 4, 8, 12, 16, 20, 23];
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
      windSpeed: p.windSpeed,
      windDir: p.windDir,
      hour: p.hour,
      symbol: p.symbol,
      tideValue: p.value
    };
  });

  if (points.length === 0) return;

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

  // 5. Current hour vertical line indicator
  const now = new Date();
  const currentHour = now.getHours();
  if (activeTab === 0) {
    const curPoint = points.find(p => p.hour === currentHour);
    if (curPoint) {
      ctx.save();
      ctx.strokeStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.7)" : accentColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curPoint.x, paddingT);
      ctx.lineTo(curPoint.x, H - paddingB);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = paramType === "rain" ? "rgba(56, 178, 255, 0.25)" : "rgba(232, 160, 69, 0.3)";
      ctx.beginPath();
      ctx.arc(curPoint.x, curPoint.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = paramType === "rain" ? "#38d4ff" : accentColor;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curPoint.x, curPoint.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 6. Draw hover tooltip / inspector cursor
  if (hoverHour !== null && hoverHour >= 0 && hoverHour < 24) {
    const hp = points.find(p => p.hour === hoverHour);
    if (hp) {
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
      
      if (paramType === "uv") {
        const uvLevel = getUVLevel(hp.uv);
        boxColor = uvLevel.color;
        tooltipLines.push(`Time: ${String(hp.hour).padStart(2, '0')}:00`);
        tooltipLines.push(`UV Index: ${hp.uv.toFixed(1)}`);
        tooltipLines.push(`Level: ${uvLevel.label}`);
      } else if (paramType === "temp") {
        const emojiInfo = getWeatherInfo(hp.symbol);
        boxColor = "#ff6b8b";
        tooltipLines.push(`Time: ${String(hp.hour).padStart(2, '0')}:00`);
        tooltipLines.push(`Temp: ${hp.temp !== null ? hp.temp.toFixed(1) : "--"}\u00B0C`);
        tooltipLines.push(`Weather: ${emojiInfo.emoji}`);
      } else if (paramType === "rain") {
        boxColor = "#38d4ff";
        tooltipLines.push(`Time: ${String(hp.hour).padStart(2, '0')}:00`);
        tooltipLines.push(`Rain: ${hp.rain !== null ? hp.rain.toFixed(1) : "0.0"} mm`);
        if (hp.rainProb !== null && hp.rainProb !== undefined) {
          tooltipLines.push(`Chance: ${hp.rainProb}%`);
        }
        if (hp.rainMax !== null && hp.rainMax > hp.rain) {
          tooltipLines.push(`Max likely: ${hp.rainMax.toFixed(1)} mm`);
        }
      } else if (paramType === "wind") {
        boxColor = "#00f5d4";
        tooltipLines.push(`Time: ${String(hp.hour).padStart(2, '0')}:00`);
        tooltipLines.push(`Wind: ${hp.windSpeed.toFixed(1)} m/s`);
        tooltipLines.push(`Direction: ${getWindDirectionLabel(hp.windDir)} (${hp.windDir}\u00B0)`);
      } else if (paramType === "tide") {
        boxColor = "#00b4d8";
        tooltipLines.push(`Time: ${String(hp.hour).padStart(2, '0')}:00`);
        tooltipLines.push(`Tide Level: ${hp.tideValue !== null ? hp.tideValue.toFixed(1) : "--"} cm`);
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

  const relativeX = x - paddingL;
  let hr = Math.round((relativeX / graphW) * 23);
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
async function loadWeatherData(lat, lon, name, silent = false) {
  showError("");
  if (!silent) {
    setLoaderState(true);
  }
  try {
    forecastData = await fetchWeather(lat, lon);
    
    currentLoc = { lat, lon, name };
    saveLocation(currentLoc);

    locationDisplay.textContent = name;
    coordinatesDisplay.textContent = `(${lat.toFixed(2)}, ${lon.toFixed(2)})`;

    if (!silent) {
      setLoaderState(false);
    }
    updateDashboardUI(forecastData);

    // Fetch tide data independently in the background
    tideData = null;
    fetchTideData(lat, lon).then(data => {
      tideData = data;
      const { data: tidePoints, found: tideFound } = getDailyTideSeries(tideData, activeTab);
      drawSingleCurve(tideCanvas, "tide", tidePoints, tideFound);
    }).catch(err => {
      console.warn("Failed to load tide data in background:", err);
      tideData = null;
      drawSingleCurve(tideCanvas, "tide", null, false);
    });

  } catch (err) {
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
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      loadWeatherData(lat, lon, "Your GPS Location");
    },
    err => {
      console.warn("GPS Location error", err);
      let errMsg = "Could not access location.";
      if (err.code === 1) errMsg = "GPS permission denied.";
      else if (err.code === 2) errMsg = "Position unavailable.";
      showError(errMsg + " Using default location.");
      
      loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name);
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
    drawForecastCurves();
    menu.remove();
  });
  menu.appendChild(btnToggle);

  // Position the menu relative to the header to lock its placement
  const header = card.querySelector(".graph-header");
  const rect = header ? header.getBoundingClientRect() : { left: x, top: y, width: 0, height: 0, bottom: y };
  
  const menuWidth = 120;
  const menuHeight = 110;
  
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
  // Mount the site layout shell
  mountSiteShell();

  // Restore layout order & minimized states
  restoreLayoutOrder();
  restoreMinimizedStates();
  setupHeaderContextMenu();

  // Load last stored location if any
  loadStoredLocation();

  // Initial data load
  loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name);

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

  // Canvas drawing & resize event listeners
  window.addEventListener("resize", drawForecastCurves);

  // Bind synced mouse/touch event listeners across all canvases
  [uvCanvas, tempCanvas, rainCanvas, windCanvas, tideCanvas].forEach(canvas => {
    if (!canvas) return;
    canvas.addEventListener("mousemove", handleCanvasHover);
    canvas.addEventListener("mouseleave", handleCanvasLeave);

    canvas.addEventListener("touchstart", handleCanvasHover, { passive: true });
    canvas.addEventListener("touchmove", handleCanvasHover, { passive: true });
    canvas.addEventListener("touchend", handleCanvasLeave);
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
        loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, true);
      }
    }
  }, 5 * 60 * 1000);

  // Refresh when user returns to the tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && forecastData && forecastData.lastUpdated) {
      const age = Date.now() - forecastData.lastUpdated;
      if (age >= CACHE_EXPIRY_MS) {
        loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name, true);
      }
    }
  });
}

// Initialize!
initWeatherPage();
