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
let activeTab = 0; // 0 for Today, 1 for Tomorrow, 2-6 for future days
let hoverHour = null; // Currently hovered hour on the canvas (0-23)

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

// WHO UV Levels config
const UV_LEVELS = [
  { max: 2.9, label: "Low", class: "uv-low", color: "#22c55e", advice: "Low danger. Safe to be outdoors. Wear sunglasses on bright days. If you burn easily, use sunscreen." },
  { max: 5.9, label: "Moderate", class: "uv-moderate", color: "#eab308", advice: "Moderate risk. Seek shade near midday. Wear protective clothing, sunglasses, and use SPF 30+ sunscreen." },
  { max: 7.9, label: "High", class: "uv-high", color: "#ea580c", advice: "High risk. Reduce time in the sun between 10 a.m. and 4 p.m. Wear protective clothing, a wide-brimmed hat, sunglasses, and SPF 30+ sunscreen." },
  { max: 10.9, label: "Very High", class: "uv-veryhigh", color: "#dc2626", advice: "Very high risk. Minimize sun exposure between 10 a.m. and 4 p.m. Wear protective clothing, a wide-brimmed hat, sunglasses, and SPF 30+ sunscreen." },
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

  // Save to cache
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
    rain: 0
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
      hoursData[hr].symbol = item.data.next_1_hours?.summary?.symbol_code || null;
      hoursData[hr].rain = item.data.next_1_hours?.details?.precipitation_amount || 0;
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
      rain: 0
    }));

    timeseries.forEach(item => {
      const itemDate = new Date(item.time);
      if (getLocalDateString(itemDate) === tomorrowStr) {
        const hr = itemDate.getHours();
        const details = item.data.instant.details;
        tomorrowHoursData[hr].uv = details.ultraviolet_index_clear_sky || 0;
        tomorrowHoursData[hr].temp = details.air_temperature;
        tomorrowHoursData[hr].symbol = item.data.next_1_hours?.summary?.symbol_code || null;
        tomorrowHoursData[hr].rain = item.data.next_1_hours?.details?.precipitation_amount || 0;
      }
    });

    // Copy tomorrow's values for any hour that doesn't have forecast data today
    hoursData.forEach(h => {
      if (h.temp === null) {
        h.uv = tomorrowHoursData[h.hour].uv;
        h.temp = tomorrowHoursData[h.hour].temp;
        h.symbol = tomorrowHoursData[h.hour].symbol;
        h.rain = tomorrowHoursData[h.hour].rain;
      }
    });
  }

  return { data: hoursData, found: hasData };
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
        if (activeTab !== i) {
          activeTab = i;
          
          buttons.forEach((t, idx) => {
            t.classList.toggle("active", idx === i);
          });

          hoverHour = null;
          drawForecastCurves();
        }
      });
    });
  }
}

// Update widgets UI with the current hourly forecast
function updateDashboardUI(data) {
  const timeseries = data.properties.timeseries;
  
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
    
    uvCircle.className = "uv-hero-circle " + uvLevel.class;
    uvAdviceEl.textContent = uvLevel.advice;
    uvAdviceEl.style.borderLeftColor = uvLevel.color;

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
}

// Redraw Debugger variables
let totalDraws = 0;
let drawsSinceReset = 0;
let lastResetTime = Date.now();

function initDrawDebugger() {
  const div = document.createElement("div");
  div.id = "draw-debugger";
  div.style.position = "fixed";
  div.style.bottom = "15px";
  div.style.right = "15px";
  div.style.background = "rgba(15, 23, 42, 0.9)";
  div.style.color = "#38d4ff";
  div.style.fontFamily = "Consolas, monospace";
  div.style.fontSize = "11px";
  div.style.padding = "8px 12px";
  div.style.borderRadius = "8px";
  div.style.zIndex = "99999";
  div.style.border = "1px solid rgba(56, 212, 255, 0.3)";
  div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
  div.style.pointerEvents = "none"; // Don't block hover/clicks
  div.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px;">Render Debugger</div>
    <div>Total Redraws: <span id="dbg-total-draws" style="font-weight:bold;color:#fff;">0</span></div>
    <div>Redraws/sec: <span id="dbg-draws-sec" style="font-weight:bold;color:#34d399;">0</span></div>
  `;
  document.body.appendChild(div);

  setInterval(() => {
    const elapsed = (Date.now() - lastResetTime) / 1000;
    const rate = Math.round(drawsSinceReset / (elapsed || 1));
    const elRate = document.getElementById("dbg-draws-sec");
    if (elRate) elRate.textContent = rate;
    
    drawsSinceReset = 0;
    lastResetTime = Date.now();
  }, 1000);
}

function recordDraw() {
  totalDraws++;
  drawsSinceReset++;
  const elTotal = document.getElementById("dbg-total-draws");
  if (elTotal) {
    elTotal.textContent = totalDraws;
  }
}

// Draw all three forecast curves simultaneously
function drawForecastCurves() {
  if (!forecastData) return;

  recordDraw();

  const timeseries = forecastData.properties.timeseries;
  const { data: dayPoints, found } = getDailyTimeseries(timeseries, activeTab);
  if (!found) return;

  drawSingleCurve(uvCanvas, "uv", dayPoints);
  drawSingleCurve(tempCanvas, "temp", dayPoints);
  drawSingleCurve(rainCanvas, "rain", dayPoints);
}

// Canvas rendering helper for a single curve parameters
function drawSingleCurve(canvas, paramType, dayPoints) {
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
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
    const maxVal = Math.max(...dayPoints.map(p => p.uv), 0);
    maxScaleY = Math.max(10, Math.ceil(maxVal + 1));
    gridLevels = [0, 3, 6, 8, 11].filter(v => v <= maxScaleY);
  } else if (paramType === "temp") {
    const temps = dayPoints.map(p => p.temp).filter(t => t !== null);
    const minTemp = temps.length ? Math.min(...temps) : 0;
    const maxTemp = temps.length ? Math.max(...temps) : 10;
    minScaleY = Math.floor(minTemp - 2);
    maxScaleY = Math.ceil(maxTemp + 2);
    const range = maxScaleY - minScaleY;
    const adjMax = range < 5 ? minScaleY + 5 : maxScaleY;
    maxScaleY = adjMax;

    const step = (maxScaleY - minScaleY) / 4;
    for (let i = 0; i <= 4; i++) {
      gridLevels.push(Math.round((minScaleY + i * step) * 10) / 10);
    }
  } else if (paramType === "rain") {
    const maxVal = Math.max(...dayPoints.map(p => p.rain), 0);
    maxScaleY = Math.max(2.0, Math.ceil(maxVal + 0.5));
    const step = maxScaleY / 4;
    for (let i = 0; i <= 4; i++) {
      gridLevels.push(Math.round((i * step) * 10) / 10);
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
  const points = dayPoints.filter(p => p.temp !== null).map(p => {
    let val = 0;
    if (paramType === "uv") val = p.uv;
    else if (paramType === "temp") val = p.temp;
    else if (paramType === "rain") val = p.rain;

    return {
      x: getX(p.hour),
      y: getY(val),
      val: val,
      uv: p.uv,
      temp: p.temp,
      rain: p.rain,
      hour: p.hour,
      symbol: p.symbol
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
      ctx.fillStyle = paramType === "rain" ? "#38d4ff" : (paramType === "temp" ? "#ff6b8b" : accentColor);
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
async function loadWeatherData(lat, lon, name) {
  showError("");
  setLoaderState(true);
  try {
    forecastData = await fetchWeather(lat, lon);
    
    currentLoc = { lat, lon, name };
    saveLocation(currentLoc);

    locationDisplay.textContent = name;
    coordinatesDisplay.textContent = `(${lat.toFixed(2)}, ${lon.toFixed(2)})`;

    setLoaderState(false);
    updateDashboardUI(forecastData);
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

// Initialize Page
function initWeatherPage() {
  // Mount the site layout shell
  mountSiteShell();

  // Initialize visual debugger
  initDrawDebugger();

  // Load last stored location if any
  loadStoredLocation();

  // Initial data load
  loadWeatherData(currentLoc.lat, currentLoc.lon, currentLoc.name);

  // Setup tab switches
  setupTabs();

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
  [uvCanvas, tempCanvas, rainCanvas].forEach(canvas => {
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
}

// Initialize!
initWeatherPage();
