import { mountSiteShell } from "../site.js";
import { ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION } from "../gentrail/config.js";

const generateHikesForPage =
  globalThis.__gentrailTestOverrides?.generateHikes ??
  (await import("../gentrail/generateHikes.js")).generateHikes;

// Mount standard site shell
mountSiteShell();

// Setup live debug console logging
const debugLogEl = document.getElementById("debug-log");
function logMessage(level, args) {
  if (debugLogEl) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
    debugLogEl.value += `[${timestamp}] [${level}] ${message}\n`;
    debugLogEl.scrollTop = debugLogEl.scrollHeight;
  }
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  logMessage("LOG", args);
};
console.error = function(...args) {
  originalError.apply(console, args);
  logMessage("ERROR", args);
};
console.warn = function(...args) {
  originalWarn.apply(console, args);
  logMessage("WARN", args);
};

window.addEventListener("error", (e) => {
  logMessage("GLOBAL ERROR", [`${e.message} at ${e.filename}:${e.lineno}`]);
});
window.addEventListener("unhandledrejection", (e) => {
  logMessage("UNHANDLED REJECTION", [e.reason?.message || e.reason]);
});

// Copy Logs Button Setup
const copyLogBtn = document.getElementById("copy-log-btn");
if (copyLogBtn && debugLogEl) {
  copyLogBtn.addEventListener("click", () => {
    debugLogEl.select();
    navigator.clipboard.writeText(debugLogEl.value)
      .then(() => {
        const originalText = copyLogBtn.textContent;
        copyLogBtn.textContent = "Copied!";
        setTimeout(() => { copyLogBtn.textContent = originalText; }, 2000);
      })
      .catch((err) => {
        originalError.apply(console, ["Copy failed:", err]);
      });
  });
}

// Show debug panel on local development hostnames/IPs
function initDebugVisibility() {
  const panel = document.getElementById("console-debug-panel");
  if (panel) {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/) ||
      hostname.endsWith(".local");
    panel.style.display = isLocal ? "block" : "none";
  }
}
initDebugVisibility();

// State variables
let start = null;
let targetDistanceKm = parseFloat(localStorage.getItem("gentrail-target-distance")) || 3;
let candidateCount = 3;
let preferences = {
  forest: 7,
  trail: 8,
  water: 5,
  avoidRoads: 8,
  avoidHighways: 10,
  avoidMinorRoads: 3,
  avoidRepetitions: 9,
  beachWalking: true,
};
let routes = [];
let selectedRouteId = undefined;
let loading = false;
let currentController = null;
let map = null;
let marker = null;
let routeLayerIds = [];

// DOM elements
const startReadout = document.getElementById("start-readout");
const startStatus = document.getElementById("start-status");
const startCoords = document.getElementById("start-coords");
const inputTargetDistance = document.getElementById("target-distance");
const selectCandidateCount = document.getElementById("candidate-count");
const btnGenerate = document.getElementById("btn-generate");
const btnText = document.getElementById("btn-text");
const btnArrow = document.getElementById("btn-arrow");
const progressContainer = document.getElementById("progress-container");
const progressStatus = document.getElementById("progress-status");
const errorMessage = document.getElementById("error-message");
const resultsSection = document.getElementById("results-section");
const infoMessage = document.getElementById("info-message");
const routeList = document.getElementById("route-list");
const debugContent = document.getElementById("debug-content");
const mapPrompt = document.getElementById("map-prompt");

// Setup map
function initMap() {
  const mapStyleUrl = "https://tiles.openfreemap.org/styles/liberty"; // Liberty is keyless
  
  map = new window.maplibregl.Map({
    container: "map",
    style: mapStyleUrl,
    center: [10.2039, 56.1629],
    zoom: 11.2,
    attributionControl: false,
  });

  map.addControl(new window.maplibregl.NavigationControl(), "top-right");
  map.addControl(
    new window.maplibregl.AttributionControl({ compact: true }),
    "bottom-right",
  );

  map.on("click", (event) => {
    // Check if clicked a route line (using an 8px buffer for easier selection)
    const activeRouteLayers = routeLayerIds.filter((id) => map.getLayer(id));
    const buffer = 8;
    const bbox = [
      [event.point.x - buffer, event.point.y - buffer],
      [event.point.x + buffer, event.point.y + buffer]
    ];
    const features = map.queryRenderedFeatures(bbox, {
      layers: activeRouteLayers,
    });
    
    if (features.length > 0) {
      const routeId = features[0].properties.candidateId;
      selectRoute(routeId);
      return;
    }

    // Prevent accidental click-away if routes are already generated
    if (routes && routes.length > 0) {
      if (!confirm("Are you sure you want to discard the generated routes and select a new trailhead?")) {
        return;
      }
    }

    // Set trailhead start point
    setStartPoint({
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
    });
  });

  map.on("mousemove", (event) => {
    const activeRouteLayers = routeLayerIds.filter((id) => map.getLayer(id));
    const buffer = 8;
    const bbox = [
      [event.point.x - buffer, event.point.y - buffer],
      [event.point.x + buffer, event.point.y + buffer]
    ];
    const overRoute = map.queryRenderedFeatures(bbox, {
      layers: activeRouteLayers,
    }).length;
    map.getCanvas().style.cursor = overRoute ? "pointer" : "crosshair";
  });
}

function setStartPoint(coords) {
  start = coords;
  routes = [];
  selectedRouteId = undefined;
  resultsSection.classList.add("display-none");
  errorMessage.classList.add("display-none");

  // Cache chosen trailhead in LocalStorage
  localStorage.setItem("gentrail-start-coords", JSON.stringify(coords));
  // Clear cached routes
  localStorage.removeItem("gentrail-cached-routes");
  localStorage.removeItem("gentrail-cached-debug");
  localStorage.removeItem("gentrail-cached-selected-route-id");

  // Update trailhead marker
  if (marker) marker.remove();
  
  const el = document.createElement("div");
  el.className = "start-marker";
  el.setAttribute("aria-label", "Hike starting point");
  marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
    .setLngLat([start.lng, start.lat])
    .addTo(map);

  // Update UI Readout
  startReadout.classList.add("start-readout--set");
  startStatus.textContent = "Trailhead set";
  startCoords.textContent = `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`;
  
  btnGenerate.disabled = false;
  mapPrompt.classList.add("display-none");

  clearMapRoutes();
}

function clearMapRoutes() {
  routeLayerIds.forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  });
  routeLayerIds = [];
}

// Bind sliders
const preferencesKeys = ["forest", "trail", "water", "avoidRoads", "avoidHighways", "avoidMinorRoads", "avoidRepetitions"];
preferencesKeys.forEach((key) => {
  const input = document.getElementById(`pref-${key}`);
  const output = document.getElementById(`val-${key}`);
  if (input && output) {
    input.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      output.textContent = val;
      preferences[key] = val;
    });
  }
});

const beachWalkingInput = document.getElementById("pref-beachWalking");
beachWalkingInput.addEventListener("change", (event) => {
  preferences.beachWalking = event.target.checked;
});

// Bind select & number inputs
inputTargetDistance.addEventListener("change", (e) => {
  targetDistanceKm = Math.max(1, Math.min(40, parseFloat(e.target.value) || 1));
  inputTargetDistance.value = targetDistanceKm;
  localStorage.setItem("gentrail-target-distance", targetDistanceKm);
});

selectCandidateCount.addEventListener("change", (e) => {
  candidateCount = parseInt(e.target.value, 10);
});

// Generate button click
btnGenerate.addEventListener("click", () => {
  if (loading) {
    cancelGeneration();
  } else {
    runGeneration();
  }
});

function cancelGeneration() {
  if (currentController) {
    currentController.abort();
  }
}

async function runGeneration() {
  if (!start) return;
  
  loading = true;
  btnGenerate.classList.add("generate-button--cancel");
  btnText.textContent = "Cancel generation";
  btnArrow.textContent = "×";
  errorMessage.classList.add("display-none");
  progressContainer.classList.remove("display-none");
  resultsSection.classList.add("display-none");
  clearMapRoutes();

  currentController = new AbortController();
  try {
    const result = await generateHikesForPage(
      {
        start,
        targetDistanceKm,
        candidateCount,
        preferences,
      },
      (statusText) => {
        progressStatus.textContent = statusText;
      },
      currentController.signal,
    );

    routes = result.routes;
    // Cache generated hikes in LocalStorage
    localStorage.setItem("gentrail-cached-routes", JSON.stringify(routes));
    localStorage.setItem("gentrail-cached-debug", JSON.stringify(result.debug));
    renderResults(result.debug);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      progressStatus.textContent = "Cancelled";
      return;
    }
    errorMessage.textContent = err.message || "Hike generation failed";
    errorMessage.classList.remove("display-none");
  } finally {
    loading = false;
    btnGenerate.classList.remove("generate-button--cancel");
    btnText.textContent = "Generate hikes";
    btnArrow.textContent = "→";
    progressContainer.classList.add("display-none");
    currentController = null;
  }
}

function renderResults(debugData) {
  resultsSection.classList.remove("display-none");
  routeList.innerHTML = "";

  const resultMessages = [];
  if (debugData?.fallbackSelectedCount > 0) {
    const count = debugData.fallbackSelectedCount;
    resultMessages.push(
      `${count} option${count === 1 ? " uses" : "s use"} relaxed distance or repetition limits.`,
    );
  }
  if (routes.length < candidateCount) {
    resultMessages.push(
      `Found ${routes.length} of ${candidateCount} requested loops with at least ${Math.round(ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION * 100)}% different paths.`,
    );
  }
  if (resultMessages.length) {
    infoMessage.textContent = resultMessages.join(" ");
    infoMessage.classList.remove("display-none");
  } else {
    infoMessage.classList.add("display-none");
  }

  // Draw routes on map
  drawRoutesOnMap();

  // Render Route Cards
  routes.forEach((scoredRoute, index) => {
    const card = buildRouteCard(scoredRoute, index);
    routeList.appendChild(card);
  });

  // Select first route
  if (routes.length > 0) {
    selectRoute(routes[0].route.candidateId);
  }

  // Render Debug JSON
  debugContent.textContent = JSON.stringify(debugData, null, 2);
}

function buildRouteCard(scoredRoute, index) {
  const { route, score, color } = scoredRoute;
  const card = document.createElement("div");
  card.className = "route-card";
  card.id = `card-${route.candidateId}`;
  card.style.setProperty("--route-color", color);

  const durationStr = formatDuration(route.durationSeconds);
  const distStr = `${(route.distanceMeters / 1000).toFixed(1)} km`;

  card.innerHTML = `
    <div class="route-card__header">
      <div>
        <span class="route-card__eyebrow">Option ${index + 1}</span>
        <h3>Hike Loop</h3>
      </div>
      <div class="score-badge">
        <strong>${score.total}</strong>
        <span>Pts</span>
      </div>
    </div>
    <div class="route-card__facts">
      <span>${distStr}</span>
      <span>•</span>
      <span>${durationStr}</span>
    </div>
    <div class="warnings">
      ${score.warnings.map(w => `<span>${w}</span>`).join("")}
    </div>
    <div class="route-card__actions" style="margin-top: 12px; display: flex; justify-content: flex-end;">
      <button class="gpx-export-btn" title="Download GPX file">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Export GPX</span>
      </button>
    </div>
    <div class="score-breakdown display-none" id="breakdown-${route.candidateId}">
      <!-- Score breakdown rows -->
    </div>
  `;

  // Append breakdown details dynamically
  const breakdownContainer = card.querySelector(`#breakdown-${route.candidateId}`);
  Object.entries(score.components).forEach(([key, component]) => {
    if (component.value === 0 && !component.explanation) return;
    const isPenalty = key.toLowerCase().includes("penalty");
    const pointsStr = isPenalty
      ? `${component.weightedPoints.toFixed(1)}`
      : `+${component.weightedPoints.toFixed(1)}`;
    const label = formatComponentLabel(key);

    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <div>
        <span>${label}</span>
        <small>${component.explanation}</small>
      </div>
      <strong class="${isPenalty ? 'penalty' : ''}">${pointsStr}</strong>
    `;
    breakdownContainer.appendChild(row);
  });

  const exportBtn = card.querySelector(".gpx-export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      downloadGPX(scoredRoute, index);
    });
  }

  card.addEventListener("click", () => {
    selectRoute(route.candidateId);
  });

  return card;
}

function selectRoute(routeId) {
  selectedRouteId = routeId;
  localStorage.setItem("gentrail-cached-selected-route-id", routeId);

  // Update DOM active card state
  const cards = document.querySelectorAll(".route-card");
  cards.forEach((c) => {
    const cardRouteId = c.id.replace("card-", "");
    const breakdown = c.querySelector(`#breakdown-${cardRouteId}`);
    if (cardRouteId === selectedRouteId) {
      c.classList.add("route-card--selected");
      breakdown.classList.remove("display-none");
    } else {
      c.classList.remove("route-card--selected");
      breakdown.classList.add("display-none");
    }
  });

  // Highlight layer on map
  routeLayerIds.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    const selected = layerId.endsWith(selectedRouteId);
    map.setPaintProperty(layerId, "line-width", selected ? 7 : 4.5);
    map.setPaintProperty(layerId, "line-opacity", selected ? 0.95 : 0.48);
    map.setPaintProperty(layerId, "line-blur", selected ? 0 : 0.3);
  });
}

function drawRoutesOnMap() {
  clearMapRoutes();

  routeLayerIds = routes.map(
    (route, index) => `route-${index}-${route.route.candidateId}`,
  );

  routes.forEach((route, index) => {
    const layerId = routeLayerIds[index];
    map.addSource(layerId, {
      type: "geojson",
      data: {
        ...route.route.geometry,
        properties: { candidateId: route.route.candidateId },
      },
    });
    map.addLayer({
      id: layerId,
      type: "line",
      source: layerId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": route.color,
        "line-width": 4.5,
        "line-opacity": 0.9,
        "line-blur": 0.3,
      },
    });
  });

  // Fit bounds to routes
  if (routes.length > 0) {
    const bounds = new window.maplibregl.LngLatBounds();
    routes.forEach((route) =>
      route.route.geometry.geometry.coordinates.forEach((coordinate) =>
        bounds.extend(coordinate),
      ),
    );
    
    // Desktop vs mobile left padding
    const leftPad = window.innerWidth < 760 ? 40 : 440;
    map.fitBounds(bounds, {
      padding: { top: 80, right: 80, bottom: 80, left: leftPad },
      duration: 900,
      maxZoom: 15,
    });
  }
}

// Helpers
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  return `${minutes} min`;
}

function formatComponentLabel(camelCaseKey) {
  const label = camelCaseKey
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
  return label.replace(" Score", "").replace(" Penalty", "");
}

function loadStoredStartPoint() {
  try {
    const storedStart = localStorage.getItem("gentrail-start-coords");
    if (storedStart) {
      const coords = JSON.parse(storedStart);
      if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
        map.on("load", () => {
          start = coords;
          
          // Update trailhead marker
          if (marker) marker.remove();
          const el = document.createElement("div");
          el.className = "start-marker";
          el.setAttribute("aria-label", "Hike starting point");
          marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([start.lng, start.lat])
            .addTo(map);

          // Update UI Readout
          startReadout.classList.add("start-readout--set");
          startStatus.textContent = "Trailhead set";
          startCoords.textContent = `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`;
          btnGenerate.disabled = false;
          mapPrompt.classList.add("display-none");
          
          map.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });

          // Load cached routes
          const storedRoutes = localStorage.getItem("gentrail-cached-routes");
          const storedDebug = localStorage.getItem("gentrail-cached-debug");
          if (storedRoutes) {
            routes = JSON.parse(storedRoutes);
            const debugData = storedDebug ? JSON.parse(storedDebug) : null;
            renderResults(debugData);
            
            // Restore selection if stored
            const storedSel = localStorage.getItem("gentrail-cached-selected-route-id");
            if (storedSel && routes.some(r => r.route.candidateId === storedSel)) {
              selectRoute(storedSel);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn("Failed to load stored trailhead and hikes:", err);
  }
}

// Initialize
initMap();
loadStoredStartPoint();
inputTargetDistance.value = targetDistanceKm;

function downloadGPX(scoredRoute, index) {
  const { route } = scoredRoute;
  const name = `GenTrail_Hike_Loop_${index + 1}`;
  const coordinates = route.coordinates;
  
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GenTrail" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <desc>Generated route from GenTrail with distance ${(route.distanceMeters / 1000).toFixed(2)} km</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <desc>GenTrail Route - Option ${index + 1}</desc>
    <trkseg>
`;

  coordinates.forEach(coord => {
    gpxContent += `      <trkpt lat="${coord.lat}" lon="${coord.lng}"></trkpt>\n`;
  });

  gpxContent += `    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
