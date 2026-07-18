import { mountSiteShell } from "../site.js";
import { ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION } from "../gentrail/config.js";

const testGenerateHikes = globalThis.__gentrailTestOverrides?.generateHikes;
let generateHikesModulePromise = null;

async function getGenerateHikes() {
  if (testGenerateHikes) return testGenerateHikes;
  generateHikesModulePromise ??= import("../gentrail/generateHikes.js");
  return (await generateHikesModulePromise).generateHikes;
}

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
const GENERATION_CACHE_KEY = "gentrail-generation-cache";
const GENERATION_CACHE_VERSION = 1;
const DEFAULT_TARGET_DISTANCE_KM = 3;
const ROUTE_OPTION_COUNT = 5;
const DEFAULT_PREFERENCES = Object.freeze({
  forest: 7,
  trail: 8,
  water: 5,
  avoidRoads: 8,
  avoidHighways: 10,
  avoidMinorRoads: 3,
  avoidRepetitions: 9,
  beachWalking: true,
});
const LEGACY_CACHE_KEYS = [
  "gentrail-cached-routes",
  "gentrail-cached-debug",
  "gentrail-cached-selected-route-id",
];

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Could not read local storage key ${key}:`, error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Could not save local storage key ${key}:`, error);
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Could not remove local storage key ${key}:`, error);
  }
}

let start = null;
let targetDistanceKm = parseFloat(readStorage("gentrail-target-distance")) || DEFAULT_TARGET_DISTANCE_KM;
const candidateCount = ROUTE_OPTION_COUNT;
let preferences = { ...DEFAULT_PREFERENCES };
let routes = [];
let selectedRouteId = undefined;
let latestDebugData = null;
let latestGenerationSettings = null;
let loading = false;
let currentController = null;
let generationSequence = 0;
let resetFeedbackTimer = null;
let map = null;
let marker = null;
let routeLayerIds = [];
let routeVisuals = [];

const ROUTE_ARROW_IMAGE_ID = "gentrail-route-arrow";

// DOM elements
const startReadout = document.getElementById("start-readout");
const startStatus = document.getElementById("start-status");
const startCoords = document.getElementById("start-coords");
const inputTargetDistance = document.getElementById("target-distance");
const btnResetPreferences = document.getElementById("btn-reset-preferences");
const btnGenerate = document.getElementById("btn-generate");
const btnText = document.getElementById("btn-text");
const btnArrow = document.getElementById("btn-arrow");
const progressContainer = document.getElementById("progress-container");
const progressStatus = document.getElementById("progress-status");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const errorMessage = document.getElementById("error-message");
const resultsSection = document.getElementById("results-section");
const infoMessage = document.getElementById("info-message");
const routeList = document.getElementById("route-list");
const debugContent = document.getElementById("debug-content");
const btnBetaReport = document.getElementById("btn-beta-report");
const mapPrompt = document.getElementById("map-prompt");
const mapLocationStatus = document.getElementById("map-location-status");

function confirmTrailheadChange() {
  return !routes?.length || confirm("Are you sure you want to discard the generated routes and select a new trailhead?");
}

function showLocationError(error) {
  const messages = {
    1: "Location access was denied. Enable location access in your browser, then reload and try again.",
    2: "Your current location is unavailable. Check that GPS is enabled and try again.",
    3: "Finding your location timed out. Move somewhere with a clearer GPS signal and try again.",
  };
  mapLocationStatus.textContent = messages[error?.code] ?? "Your current location could not be found. Check GPS and try again.";
  mapLocationStatus.classList.remove("display-none");
}

// Setup map
function initMap() {
  if (!window.maplibregl?.Map) {
    errorMessage.textContent = "The map library could not be loaded. Check your connection and reload the page.";
    errorMessage.classList.remove("display-none");
    startStatus.textContent = "Map unavailable";
    return false;
  }

  const mapStyleUrl = "https://tiles.openfreemap.org/styles/liberty"; // Liberty is keyless
  
  map = new window.maplibregl.Map({
    container: "map",
    style: mapStyleUrl,
    center: [10.2039, 56.1629],
    zoom: 11.2,
    attributionControl: false,
  });

  map.addControl(new window.maplibregl.NavigationControl(), "top-right");
  if (window.maplibregl.GeolocateControl) {
    const geolocateControl = new window.maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      },
      fitBoundsOptions: {
        maxZoom: 15,
      },
      trackUserLocation: false,
      showUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geolocateControl, "top-right");
    geolocateControl.on("geolocate", (position) => {
      const latitude = Number(position?.coords?.latitude);
      const longitude = Number(position?.coords?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        showLocationError();
        return;
      }
      if (!confirmTrailheadChange()) return;
      mapLocationStatus.classList.add("display-none");
      setStartPoint({ lat: latitude, lng: longitude });
    });
    geolocateControl.on("error", showLocationError);
  }
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
    if (!confirmTrailheadChange()) return;

    // Set trailhead start point
    setStartPoint({
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
    }, true);
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
  return true;
}

function setStartPoint(coords, revealControls = false) {
  invalidateActiveGeneration();
  start = coords;
  routes = [];
  selectedRouteId = undefined;
  resultsSection.classList.add("display-none");
  routeList.replaceChildren();
  errorMessage.classList.add("display-none");

  // Cache chosen trailhead in LocalStorage
  writeStorage("gentrail-start-coords", JSON.stringify(coords));
  // Clear cached routes
  removeStorage(GENERATION_CACHE_KEY);
  LEGACY_CACHE_KEYS.forEach(removeStorage);

  updateStartDisplay(coords);

  btnGenerate.disabled = false;
  mapPrompt.classList.add("display-none");

  clearMapRoutes();

  if (revealControls && window.matchMedia?.("(max-width: 760px)").matches) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      startReadout.closest(".control-section")?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }
}

function updateStartDisplay(coords, snapDistanceMeters = 0) {
  start = { lat: coords.lat, lng: coords.lng };

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
  startStatus.textContent = snapDistanceMeters >= 1
    ? "Trailhead snapped to path"
    : "Trailhead set";
  const snapText = snapDistanceMeters >= 1
    ? ` • ${formatDistance(snapDistanceMeters)} from click`
    : "";
  startCoords.textContent = `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}${snapText}`;
}

function invalidateActiveGeneration() {
  generationSequence += 1;
  currentController?.abort();
}

function clearMapRoutes() {
  routeVisuals.forEach(({ layerIds }) => {
    [...layerIds].reverse().forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
  });
  routeVisuals.forEach(({ sourceIds }) => {
    sourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
  });
  routeLayerIds = [];
  routeVisuals = [];
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

// Bind settings inputs
inputTargetDistance.addEventListener("change", (e) => {
  targetDistanceKm = Math.max(1, Math.min(40, parseFloat(e.target.value) || 1));
  inputTargetDistance.value = targetDistanceKm;
  writeStorage("gentrail-target-distance", targetDistanceKm);
});

btnResetPreferences.addEventListener("click", () => {
  applyGenerationSettings({
    targetDistanceKm,
    candidateCount: ROUTE_OPTION_COUNT,
    preferences: DEFAULT_PREFERENCES,
  });
  removeStorage(GENERATION_CACHE_KEY);
  LEGACY_CACHE_KEYS.forEach(removeStorage);

  clearTimeout(resetFeedbackTimer);
  btnResetPreferences.textContent = "Tuning reset";
  resetFeedbackTimer = setTimeout(() => {
    btnResetPreferences.textContent = "Reset tuning";
  }, 1600);
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
  generationSequence += 1;
  if (currentController) {
    currentController.abort();
  }
}

async function runGeneration() {
  if (!start) return;

  const generationId = ++generationSequence;
  const generationSettings = {
    start: { ...start },
    targetDistanceKm,
    candidateCount,
    preferences: { ...preferences },
  };
  
  loading = true;
  btnResetPreferences.disabled = true;
  btnGenerate.classList.add("generate-button--cancel");
  btnText.textContent = "Cancel generation";
  btnArrow.textContent = "×";
  errorMessage.classList.add("display-none");
  progressContainer.classList.remove("display-none");
  updateGenerationProgress("Preparing route generation...", 0);
  resultsSection.classList.add("display-none");
  clearMapRoutes();

  const controller = new AbortController();
  currentController = controller;
  try {
    const generateHikesForPage = await getGenerateHikes();
    const result = await generateHikesForPage(
      generationSettings,
      (statusText, progress) => {
        updateGenerationProgress(statusText, progress?.percent);
      },
      controller.signal,
    );

    if (generationId !== generationSequence || controller.signal.aborted) {
      progressStatus.textContent = "Cancelled";
      return;
    }

    latestGenerationSettings = generationSettings;
    const snappedTrailhead = result.trailhead?.snapped;
    if (snappedTrailhead) {
      updateStartDisplay(
        snappedTrailhead,
        result.trailhead.snapDistanceMeters,
      );
      writeStorage("gentrail-start-coords", JSON.stringify(start));
    }

    routes = result.routes;
    renderResults(result.debug);
    persistGenerationCache();
  } catch (err) {
    if (
      controller.signal.aborted ||
      (err instanceof DOMException && err.name === "AbortError")
    ) {
      progressStatus.textContent = "Cancelled";
      return;
    }
    if (generationId !== generationSequence) return;
    errorMessage.textContent = err.message || "Hike generation failed";
    errorMessage.classList.remove("display-none");
  } finally {
    if (currentController === controller) {
      loading = false;
      btnGenerate.classList.remove("generate-button--cancel");
      btnText.textContent = "Generate hikes";
      btnArrow.textContent = "→";
      progressContainer.classList.add("display-none");
      btnResetPreferences.disabled = false;
      currentController = null;
    }
  }
}

function updateGenerationProgress(statusText, percent) {
  progressStatus.textContent = statusText;
  if (!Number.isFinite(percent)) return;

  const boundedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  progressFill.style.width = `${boundedPercent}%`;
  progressPercent.value = `${boundedPercent}%`;
  progressPercent.textContent = `${boundedPercent}%`;
  progressBar.setAttribute("aria-valuenow", String(boundedPercent));
}

function renderResults(debugData) {
  latestDebugData = debugData;
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
      `Found ${routes.length} distinct loop${routes.length === 1 ? "" : "s"}; GenTrail normally shows up to ${candidateCount} with at least ${Math.round(ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION * 100)}% different paths.`,
    );
  }
  if (debugData?.trailheadSnapDistanceMeters > 250) {
    resultMessages.push(
      `Trailhead moved ${formatDistance(debugData.trailheadSnapDistanceMeters)} to the nearest connected path.`,
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
    selectRoute(routes[0].route.candidateId, false);
  }

  // Render Debug JSON
  debugContent.textContent = JSON.stringify(debugData, null, 2);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable");
}

btnBetaReport.addEventListener("click", async () => {
  const selected = routes.find(({ route }) => route.candidateId === selectedRouteId);
  const report = {
    generatedAt: new Date().toISOString(),
    page: window.location.href,
    trailhead: start,
    settings: latestGenerationSettings ?? {
      targetDistanceKm,
      candidateCount,
      preferences: { ...preferences },
    },
    selectedRoute: selected ?? null,
    generationDebug: latestDebugData,
  };
  const originalText = btnBetaReport.textContent;

  try {
    await copyText(JSON.stringify(report, null, 2));
    btnBetaReport.textContent = "Copied — send it to Peter";
  } catch (error) {
    btnBetaReport.textContent = "Could not copy report";
    console.error("Could not copy beta report:", error);
  } finally {
    setTimeout(() => { btnBetaReport.textContent = originalText; }, 2500);
  }
});

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

function selectRoute(routeId, persistSelection = true) {
  selectedRouteId = routeId;

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

  // Keep the selected route dominant and show its traversal aids only.
  routeVisuals.forEach((visual) => {
    const selected = visual.routeId === selectedRouteId;
    if (map.getLayer(visual.lineLayerId)) {
      map.setPaintProperty(
        visual.lineLayerId,
        "line-width",
        selected ? 7 : window.innerWidth < 760 ? 2.5 : 3.5,
      );
      map.setPaintProperty(visual.lineLayerId, "line-opacity", selected ? 0.98 : 0.2);
      map.setPaintProperty(visual.lineLayerId, "line-blur", selected ? 0 : 0.5);
    }
    visual.guideLayerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", selected ? "visible" : "none");
      }
    });
  });

  const selectedVisual = routeVisuals.find(({ routeId: id }) => id === selectedRouteId);
  if (selectedVisual) {
    // Re-adding is unnecessary: moving each layer in visual order puts the
    // selected route and its annotations above the other candidates.
    selectedVisual.layerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) map.moveLayer(layerId);
    });
  }
  if (persistSelection) persistGenerationCache();
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const position = lengthSquared
    ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared))
    : 0;
  return Math.hypot(px - (x1 + position * dx), py - (y1 + position * dy));
}

function ensureRouteArrowImage() {
  if (map.hasImage(ROUTE_ARROW_IMAGE_ID)) return true;

  const width = 36;
  const height = 28;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.min(
        distanceToSegment(x, y, 9, 5, 25, 14),
        distanceToSegment(x, y, 25, 14, 9, 23),
      );
      if (distance > 4) continue;
      const pixel = (y * width + x) * 4;
      const inside = distance <= 2;
      pixels[pixel] = inside ? 255 : 37;
      pixels[pixel + 1] = inside ? 255 : 52;
      pixels[pixel + 2] = inside ? 255 : 45;
      pixels[pixel + 3] = inside ? 255 : 225;
    }
  }
  map.addImage(
    ROUTE_ARROW_IMAGE_ID,
    { width, height, data: pixels },
    { pixelRatio: 2 },
  );
  return true;
}

function routePositions(route) {
  return route.geometry?.geometry?.coordinates ?? [];
}

function routeNodeKeys(route, positions) {
  if (route.nodePath?.length === positions.length) {
    return route.nodePath.map(String);
  }
  return positions.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`);
}

function undirectedEdgeKey(first, second) {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function repeatedTraversalGeoJSON(route) {
  const positions = routePositions(route);
  const nodes = routeNodeKeys(route, positions);
  const edgeCounts = new Map();
  for (let index = 1; index < nodes.length; index += 1) {
    const key = undirectedEdgeKey(nodes[index - 1], nodes[index]);
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  }

  const features = [];
  let run = null;
  for (let index = 1; index < nodes.length; index += 1) {
    const key = undirectedEdgeKey(nodes[index - 1], nodes[index]);
    if ((edgeCounts.get(key) ?? 0) > 1) {
      run ??= [positions[index - 1]];
      run.push(positions[index]);
    } else if (run) {
      features.push({
        type: "Feature",
        properties: { candidateId: route.candidateId },
        geometry: { type: "LineString", coordinates: run },
      });
      run = null;
    }
  }
  if (run) {
    features.push({
      type: "Feature",
      properties: { candidateId: route.candidateId },
      geometry: { type: "LineString", coordinates: run },
    });
  }
  return { type: "FeatureCollection", features };
}

function positionDistanceMeters(first, second) {
  const toRadians = Math.PI / 180;
  const lat1 = first[1] * toRadians;
  const lat2 = second[1] * toRadians;
  const dLat = lat2 - lat1;
  const dLng = (second[0] - first[0]) * toRadians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function positionAfterIndex(positions, startIndex, distanceMeters = 28) {
  let remaining = distanceMeters;
  for (let index = startIndex + 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    const segmentMeters = positionDistanceMeters(from, to);
    if (segmentMeters >= remaining && segmentMeters > 0) {
      const ratio = remaining / segmentMeters;
      return [
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
      ];
    }
    remaining -= segmentMeters;
  }
  return positions[Math.min(startIndex + 1, positions.length - 1)];
}

function ambiguousVisitGeoJSON(route) {
  const positions = routePositions(route);
  const nodes = routeNodeKeys(route, positions);
  const occurrences = new Map();
  const edgeCounts = new Map();
  for (let index = 1; index < nodes.length; index += 1) {
    const key = undirectedEdgeKey(nodes[index - 1], nodes[index]);
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  }
  nodes.forEach((node, index) => {
    if (!occurrences.has(node)) occurrences.set(node, []);
    occurrences.get(node).push(index);
  });

  const features = [];
  let junction = 0;
  occurrences.forEach((indices) => {
    const onlyClosesLoop =
      indices.length === 2 && indices[0] === 0 && indices[1] === positions.length - 1;
    const visitsWithAnExit = indices.filter((index) => index < positions.length - 1);
    if (onlyClosesLoop || visitsWithAnExit.length < 2) return;

    // A return route visits every bend in its shared corridor twice. Those
    // nodes are not decisions: both adjoining edges are repeated and the
    // offset lines/arrows already explain them. Keep numbers only where at
    // least one visit connects to a unique branch.
    const connectsToUniqueBranch = indices.some((index) => {
      const incoming = index > 0
        ? edgeCounts.get(undirectedEdgeKey(nodes[index - 1], nodes[index]))
        : Infinity;
      const outgoing = index < nodes.length - 1
        ? edgeCounts.get(undirectedEdgeKey(nodes[index], nodes[index + 1]))
        : Infinity;
      return incoming === 1 || outgoing === 1;
    });
    if (!connectsToUniqueBranch) return;

    junction += 1;
    visitsWithAnExit.forEach((index, visit) => {
      features.push({
        type: "Feature",
        properties: {
          candidateId: route.candidateId,
          junction,
          visit: String(visit + 1),
        },
        geometry: {
          type: "Point",
          coordinates: positionAfterIndex(positions, index),
        },
      });
    });
  });
  return { type: "FeatureCollection", features };
}

function drawRoutesOnMap() {
  clearMapRoutes();
  const arrowsAvailable = ensureRouteArrowImage();

  routeLayerIds = routes.map(
    (route, index) => `route-${index}-${route.route.candidateId}`,
  );

  routes.forEach((route, index) => {
    const layerId = routeLayerIds[index];
    const sourceId = `${layerId}-source`;
    const layerIds = [];
    const sourceIds = [sourceId];
    const guideLayerIds = [];
    const repeatedTraversals = repeatedTraversalGeoJSON(route.route);
    const ambiguousVisits = ambiguousVisitGeoJSON(route.route);

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        ...route.route.geometry,
        properties: { candidateId: route.route.candidateId },
      },
    });
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
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
    layerIds.push(layerId);

    if (repeatedTraversals.features.length) {
      const repeatedSourceId = `${layerId}-repeated-source`;
      const repeatedLayerId = `${layerId}-repeated`;
      map.addSource(repeatedSourceId, {
        type: "geojson",
        data: repeatedTraversals,
      });
      sourceIds.push(repeatedSourceId);
      map.addLayer({
        id: repeatedLayerId,
        type: "line",
        source: repeatedSourceId,
        layout: {
          visibility: "none",
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": route.color,
          "line-width": 4,
          "line-offset": 3.5,
          "line-opacity": 1,
        },
      });
      layerIds.push(repeatedLayerId);
      guideLayerIds.push(repeatedLayerId);

      if (arrowsAvailable) {
        const repeatedArrowLayerId = `${layerId}-repeated-arrows`;
        map.addLayer({
          id: repeatedArrowLayerId,
          type: "symbol",
          source: repeatedSourceId,
          layout: {
            visibility: "none",
            "symbol-placement": "line-center",
            "icon-image": ROUTE_ARROW_IMAGE_ID,
            "icon-size": 0.9,
            "icon-offset": [0, 4],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-keep-upright": false,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
        layerIds.push(repeatedArrowLayerId);
        guideLayerIds.push(repeatedArrowLayerId);
      }
    }

    if (arrowsAvailable) {
      const arrowLayerId = `${layerId}-arrows`;
      map.addLayer({
        id: arrowLayerId,
        type: "symbol",
        source: sourceId,
        layout: {
          visibility: "none",
          "symbol-placement": "line",
          "symbol-spacing": window.innerWidth < 760 ? 90 : 115,
          "icon-image": ROUTE_ARROW_IMAGE_ID,
          "icon-size": 0.9,
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
          "icon-keep-upright": false,
          "icon-allow-overlap": false,
          "icon-ignore-placement": true,
        },
      });
      layerIds.push(arrowLayerId);
      guideLayerIds.push(arrowLayerId);
    }

    if (ambiguousVisits.features.length) {
      const visitSourceId = `${layerId}-visits-source`;
      const visitCircleLayerId = `${layerId}-visit-circles`;
      const visitLabelLayerId = `${layerId}-visit-labels`;
      map.addSource(visitSourceId, {
        type: "geojson",
        data: ambiguousVisits,
      });
      sourceIds.push(visitSourceId);
      map.addLayer({
        id: visitCircleLayerId,
        type: "circle",
        source: visitSourceId,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 10,
          "circle-color": "#ffffff",
          "circle-stroke-color": route.color,
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: visitLabelLayerId,
        type: "symbol",
        source: visitSourceId,
        layout: {
          visibility: "none",
          "text-field": ["get", "visit"],
          "text-size": 12,
          "text-font": ["Noto Sans Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#20352b",
        },
      });
      layerIds.push(visitCircleLayerId, visitLabelLayerId);
      guideLayerIds.push(visitCircleLayerId, visitLabelLayerId);
    }

    routeVisuals.push({
      routeId: route.route.candidateId,
      lineLayerId: layerId,
      layerIds,
      sourceIds,
      guideLayerIds,
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

function formatDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatComponentLabel(camelCaseKey) {
  const label = camelCaseKey
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
  return label.replace(" Score", "").replace(" Penalty", "");
}

function persistGenerationCache() {
  if (!start || !routes.length || !latestGenerationSettings) return;
  const cache = {
    version: GENERATION_CACHE_VERSION,
    savedAt: new Date().toISOString(),
    trailhead: { ...start },
    settings: latestGenerationSettings,
    routes,
    debug: latestDebugData,
    selectedRouteId,
  };
  if (writeStorage(GENERATION_CACHE_KEY, JSON.stringify(cache))) {
    LEGACY_CACHE_KEYS.forEach(removeStorage);
  }
}

function readGenerationCache() {
  const stored = readStorage(GENERATION_CACHE_KEY);
  if (!stored) return null;
  try {
    const cache = JSON.parse(stored);
    if (
      cache?.version !== GENERATION_CACHE_VERSION ||
      !isCoordinate(cache.trailhead) ||
      !isGenerationSettings(cache.settings) ||
      !Array.isArray(cache.routes)
    ) {
      removeStorage(GENERATION_CACHE_KEY);
      return null;
    }
    return cache;
  } catch (error) {
    console.warn("Failed to parse the stored GenTrail generation:", error);
    removeStorage(GENERATION_CACHE_KEY);
    return null;
  }
}

function isCoordinate(value) {
  return Number.isFinite(value?.lat) && Number.isFinite(value?.lng);
}

function isGenerationSettings(value) {
  return value &&
    Number.isFinite(value.targetDistanceKm) &&
    Number.isInteger(value.candidateCount) &&
    value.preferences &&
    typeof value.preferences === "object";
}

function applyGenerationSettings(settings) {
  targetDistanceKm = Math.max(1, Math.min(40, settings.targetDistanceKm));
  for (const key of preferencesKeys) {
    const value = Number(settings.preferences[key]);
    if (!Number.isFinite(value)) continue;
    preferences[key] = Math.max(0, Math.min(10, Math.round(value)));
    document.getElementById(`pref-${key}`).value = preferences[key];
    document.getElementById(`val-${key}`).textContent = preferences[key];
  }
  if (typeof settings.preferences.beachWalking === "boolean") {
    preferences.beachWalking = settings.preferences.beachWalking;
    beachWalkingInput.checked = preferences.beachWalking;
  }
  inputTargetDistance.value = targetDistanceKm;
}

function loadStoredStartPoint() {
  const cachedGeneration = readGenerationCache();
  const storedStart = readStorage("gentrail-start-coords");
  let legacyStart = null;
  try {
    legacyStart = storedStart ? JSON.parse(storedStart) : null;
  } catch (error) {
    console.warn("Failed to parse the stored GenTrail trailhead:", error);
    removeStorage("gentrail-start-coords");
  }
  const coords = cachedGeneration?.trailhead ?? legacyStart;
  if (!isCoordinate(coords)) return;

  map.on("load", () => {
    updateStartDisplay(coords);
    btnGenerate.disabled = false;
    mapPrompt.classList.add("display-none");
    map.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });

    if (!cachedGeneration?.routes.length) return;
    applyGenerationSettings(cachedGeneration.settings);
    latestGenerationSettings = cachedGeneration.settings;
    routes = cachedGeneration.routes;
    renderResults(cachedGeneration.debug ?? null);
    const storedSelection = cachedGeneration.selectedRouteId;
    if (storedSelection && routes.some(r => r.route.candidateId === storedSelection)) {
      selectRoute(storedSelection);
    }
  });
}

// Initialize
if (initMap()) loadStoredStartPoint();
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
